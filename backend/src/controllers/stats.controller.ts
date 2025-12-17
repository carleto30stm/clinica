import { Request, Response, NextFunction } from 'express';
import prisma from '../config/database';
import { DoctorHoursSummary, DailyCoverage } from '../types';
import { buildRateMap, calculateShiftPaymentFromRates } from '../utils/paymentHelpers';

/**
 * Get monthly statistics
 */
export const getMonthlyStats = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const { year, month } = req.query;

    const targetYear = year ? parseInt(year as string) : new Date().getFullYear();
    const targetMonth = month ? parseInt(month as string) - 1 : new Date().getMonth();

    const startOfMonth = new Date(targetYear, targetMonth, 1);
    const endOfMonth = new Date(targetYear, targetMonth + 1, 0, 23, 59, 59);

    const shifts = await prisma.shift.findMany({
      where: {
        startDateTime: {
          gte: startOfMonth,
          lte: endOfMonth,
        },
      },
      include: {
        // include both legacy single doctor and the new doctors relation
        doctor: {
          select: {
            id: true,
            name: true,
            specialty: true,
            hasDiscount: true,
          },
        },
        doctors: {
          include: {
            doctor: {
              select: {
                id: true,
                name: true,
                specialty: true,
                hasDiscount: true,
              },
            },
          },
        },
      },
    });

    const totalShifts = shifts.length;
    // A shift is considered assigned if it has at least one doctor (either legacy doctorId or new doctors relation)
    const assignedShifts = shifts.filter((s) => (s.doctors && s.doctors.length > 0) || s.doctorId).length;
    // Available means no doctors assigned
    const availableShifts = shifts.filter((s) => s.isAvailable && !((s.doctors && s.doctors.length > 0) || s.doctorId)).length;

    // Calculate total hours (normalize overnight end times if necessary)
    const totalHours = shifts.reduce((acc, shift) => {
      let effectiveEnd = new Date(shift.endDateTime);
      while (effectiveEnd.getTime() <= new Date(shift.startDateTime).getTime()) {
        effectiveEnd = new Date(effectiveEnd.getTime() + 24 * 60 * 60 * 1000);
      }
      const hours = (effectiveEnd.getTime() - new Date(shift.startDateTime).getTime()) / (1000 * 60 * 60);
      return acc + hours;
    }, 0);

    // Load rates once for payment calculation
    const rateMap = await buildRateMap();

    // Preload holidays for the month (includes recurrent holidays)
    const holidays = await prisma.holiday.findMany({
      where: {
        OR: [
          { isRecurrent: true },
          { date: { gte: startOfMonth, lte: endOfMonth } },
        ],
      },
    });

    const pad = (n: number) => String(n).padStart(2, '0');
    const holidaySet = new Set<string>();
    const recurringSet = new Set<string>();
    holidays.forEach((h) => {
      const d = new Date(h.date);
      if (h.isRecurrent) {
        recurringSet.add(`${pad(d.getMonth() + 1)}-${pad(d.getDate())}`);
      } else {
        holidaySet.add(`${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`);
      }
    });

    // Calculate hours and payments per doctor
    const doctorHoursMap = new Map<string, DoctorHoursSummary>();

    shifts.forEach((shift) => {
      // Build list of assigned doctors (supporting legacy doctorId and new doctors relation)
      const assignedDoctors = (shift.doctors && shift.doctors.length > 0)
        ? shift.doctors.map((d) => ({ id: d.doctorId, name: d.doctor?.name, specialty: d.doctor?.specialty, hasDiscount: d.doctor?.hasDiscount }))
        : (shift.doctorId ? [{ id: shift.doctorId, name: shift.doctor?.name, specialty: shift.doctor?.specialty, hasDiscount: shift.doctor?.hasDiscount }] : []);

      if (assignedDoctors.length === 0) return;

      // Normalize end in case it's earlier than start (legacy bad data)
      let effectiveEnd = new Date(shift.endDateTime);
      while (effectiveEnd.getTime() <= new Date(shift.startDateTime).getTime()) {
        effectiveEnd = new Date(effectiveEnd.getTime() + 24 * 60 * 60 * 1000);
      }
      const hours = (effectiveEnd.getTime() - new Date(shift.startDateTime).getTime()) / (1000 * 60 * 60);

      // Compute payment for the shift (using normalized end)
      let shiftTotalAmount = 0;
      let shiftBreakdown: Array<{ type: string; hours: number; amount: number }> = [];
      try {
        const isHolidayOrWeekend = shift.dayCategory === 'WEEKEND' || shift.dayCategory === 'HOLIDAY';
        const payment = calculateShiftPaymentFromRates(rateMap, shift.startDateTime, effectiveEnd, isHolidayOrWeekend, holidaySet, recurringSet);
        shiftTotalAmount = payment.totalAmount;
        shiftBreakdown = payment.breakdown.map((b) => ({ type: b.type, hours: b.hours, amount: b.amount }));
      } catch (e) {
        // ignore calculation error
      }

      // Each doctor receives full hours and full payment for the shift (no splitting)
      assignedDoctors.forEach((doc) => {
        const existing = doctorHoursMap.get(doc.id);
        if (existing) {
          existing.totalHours += hours;
          existing.shiftCount += 1;
          if (shift.type === 'FIXED') existing.fixedShifts += 1;
          else existing.rotatingShifts += 1;
          existing.totalPayment = (existing.totalPayment || 0) + shiftTotalAmount;

          // merge full breakdown
          existing.paymentBreakdown = existing.paymentBreakdown || [];
          shiftBreakdown.forEach((b) => {
            const prev = existing.paymentBreakdown!.find((p) => p.periodType === b.type);
            if (prev) {
              prev.hours += b.hours;
              prev.amount += b.amount;
            } else {
              existing.paymentBreakdown!.push({ periodType: b.type, hours: b.hours, amount: b.amount });
            }
          });
        } else {
          const newEntry: DoctorHoursSummary = {
            doctorId: doc.id,
            doctorName: doc.name || 'Desconocido',
            specialty: doc.specialty || null,
            totalHours: hours,
            shiftCount: 1,
            fixedShifts: shift.type === 'FIXED' ? 1 : 0,
            rotatingShifts: shift.type === 'ROTATING' ? 1 : 0,
            totalPayment: shiftTotalAmount,
            paymentBreakdown: shiftBreakdown.map((b) => ({ periodType: b.type, hours: b.hours, amount: b.amount })),
            hasDiscount: doc.hasDiscount || false,
          };
          doctorHoursMap.set(doc.id, newEntry);
        }
      });
    });

    // Get external hours for the same period
    const externalHours = await prisma.externalHours.findMany({
      where: {
        date: {
          gte: startOfMonth,
          lte: endOfMonth,
        },
      },
      include: {
        doctor: {
          select: {
            id: true,
            name: true,
            specialty: true,
            hasDiscount: true,
          },
        },
      },
    });

    // Add external hours to doctor summaries
    externalHours.forEach((ext) => {
      const hours = Number(ext.hours);
      const rate = Number(ext.rate);
      const amount = hours * rate;
      
      let existing = doctorHoursMap.get(ext.doctorId);
      if (!existing) {
        // Create new entry if doctor doesn't have shifts
        existing = {
          doctorId: ext.doctorId,
          doctorName: ext.doctor.name,
          specialty: ext.doctor.specialty,
          totalHours: 0,
          shiftCount: 0,
          fixedShifts: 0,
          rotatingShifts: 0,
          totalPayment: 0,
          paymentBreakdown: [],
          hasDiscount: ext.doctor.hasDiscount || false,
          externalHours: 0,
          externalPayment: 0,
        };
        doctorHoursMap.set(ext.doctorId, existing);
      }
      
      // Add external hours data
      if (!existing.externalHours) existing.externalHours = 0;
      if (!existing.externalPayment) existing.externalPayment = 0;
      existing.externalHours += hours;
      existing.externalPayment += amount;
      existing.totalPayment = (existing.totalPayment || 0) + amount;
    });

    // Get active discount
    const activeDiscount = await prisma.discount.findFirst({
      where: { isActive: true },
      orderBy: { validFrom: 'desc' },
    });
    const discountAmount = activeDiscount ? Number(activeDiscount.amount) : 0;

    const doctorsSummary = Array.from(doctorHoursMap.values()).map((doctor) => {
      // Expose bruto (totalPayment before discounts) explicitly, and compute final (net) = bruto - discount
      const bruto = doctor.totalPayment || 0;
      if (doctor.hasDiscount && discountAmount > 0) {
        const finalPayment = Math.max(0, bruto - discountAmount);
        return {
          ...doctor,
          brutoPayment: bruto,
          discountAmount,
          finalPayment,
        };
      }
      return {
        ...doctor,
        brutoPayment: bruto,
        discountAmount: 0,
        finalPayment: bruto,
      };
    }).sort((a, b) => b.totalHours - a.totalHours);
    
    const totalPayment = doctorsSummary.reduce((acc, d) => acc + (d.finalPayment || 0), 0);

    res.json({
      month: targetMonth + 1,
      year: targetYear,
      totalShifts,
      assignedShifts,
      availableShifts,
      totalHours: Math.round(totalHours * 100) / 100,
      totalPayment: Math.round(totalPayment * 100) / 100,
      doctorsSummary,
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Get daily coverage for a month
 */
export const getDailyCoverage = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const { year, month } = req.query;

    const targetYear = year ? parseInt(year as string) : new Date().getFullYear();
    const targetMonth = month ? parseInt(month as string) - 1 : new Date().getMonth();

    const startOfMonth = new Date(targetYear, targetMonth, 1);
    const endOfMonth = new Date(targetYear, targetMonth + 1, 0, 23, 59, 59);
    const daysInMonth = endOfMonth.getDate();

    const shifts = await prisma.shift.findMany({
      where: {
        startDateTime: {
          gte: startOfMonth,
          lte: endOfMonth,
        },
      },
      include: {
        doctor: {
          select: {
            id: true,
            name: true,
            specialty: true,
          },
        },
        doctors: {
          include: {
            doctor: {
              select: {
                id: true,
                name: true,
                specialty: true,
              },
            },
          },
        },
      },
      orderBy: { startDateTime: 'asc' },
    });

    // Group shifts by day
    const coverage: DailyCoverage[] = [];

    for (let day = 1; day <= daysInMonth; day++) {
      const date = new Date(targetYear, targetMonth, day);
      const dayOfWeek = date.getDay();
      const isWeekend = dayOfWeek === 0 || dayOfWeek === 6;

      const dayShifts = shifts.filter((shift) => {
        const shiftDate = new Date(shift.startDateTime);
        return shiftDate.getDate() === day;
      });

      // Calculate coverage percentage (assuming 3 shifts = 100% coverage)
      const expectedShifts = 3; // Morning, afternoon, night
      const assignedDayShifts = dayShifts.filter((s) => (s.doctors && s.doctors.length > 0) || s.doctorId).length;
      const coveragePercentage = Math.min((assignedDayShifts / expectedShifts) * 100, 100);

      coverage.push({
        date: date.toISOString().split('T')[0],
        isWeekend,
        shifts: dayShifts,
        coveragePercentage: Math.round(coveragePercentage),
      });
    }

    res.json({
      month: targetMonth + 1,
      year: targetYear,
      coverage,
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Get doctor hours detail
 */
export const getDoctorHours = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const { doctorId } = req.params;
    const { year, month } = req.query;

    const targetYear = year ? parseInt(year as string) : new Date().getFullYear();
    const targetMonth = month ? parseInt(month as string) - 1 : new Date().getMonth();

    const startOfMonth = new Date(targetYear, targetMonth, 1);
    const endOfMonth = new Date(targetYear, targetMonth + 1, 0, 23, 59, 59);

    const doctor = await prisma.user.findUnique({
      where: { id: doctorId },
      select: {
        id: true,
        name: true,
        specialty: true,
      },
    });

    if (!doctor) {
      res.status(404).json({ error: 'Médico no encontrado' });
      return;
    }

    // Find shifts where the doctor is assigned either via legacy doctorId or via the doctors relation
    const shifts = await prisma.shift.findMany({
      where: {
        AND: [
          {
            startDateTime: {
              gte: startOfMonth,
              lte: endOfMonth,
            },
          },
          {
            OR: [
              { doctorId },
              { doctors: { some: { doctorId } } },
            ],
          },
        ],
      },
      include: {
        doctors: {
          include: { doctor: { select: { id: true, name: true, specialty: true, hasDiscount: true } } },
        },
        doctor: { select: { id: true, name: true, specialty: true, hasDiscount: true } },
      },
      orderBy: { startDateTime: 'asc' },
    });

    // When multiple doctors are assigned to a shift, each doctor receives the full shift hours (do not split hours)
    const totalHours = shifts.reduce((acc, shift) => {
      // Normalize end in case it's earlier than start (legacy bad data)
      let effectiveEnd = new Date(shift.endDateTime);
      while (effectiveEnd.getTime() <= new Date(shift.startDateTime).getTime()) {
        effectiveEnd = new Date(effectiveEnd.getTime() + 24 * 60 * 60 * 1000);
      }
      const hours = (effectiveEnd.getTime() - new Date(shift.startDateTime).getTime()) / (1000 * 60 * 60);
      return acc + hours;
    }, 0);

    const fixedHours = shifts
      .filter((s) => s.type === 'FIXED')
      .reduce((acc, shift) => {
        let effectiveEnd = new Date(shift.endDateTime);
        while (effectiveEnd.getTime() <= new Date(shift.startDateTime).getTime()) {
          effectiveEnd = new Date(effectiveEnd.getTime() + 24 * 60 * 60 * 1000);
        }
        const hours = (effectiveEnd.getTime() - new Date(shift.startDateTime).getTime()) / (1000 * 60 * 60);
        return acc + hours;
      }, 0);

    const rotatingHours = shifts
      .filter((s) => s.type === 'ROTATING')
      .reduce((acc, shift) => {
        let effectiveEnd = new Date(shift.endDateTime);
        while (effectiveEnd.getTime() <= new Date(shift.startDateTime).getTime()) {
          effectiveEnd = new Date(effectiveEnd.getTime() + 24 * 60 * 60 * 1000);
        }
        const hours = (effectiveEnd.getTime() - new Date(shift.startDateTime).getTime()) / (1000 * 60 * 60);
        return acc + hours;
      }, 0);

    const weekendHours = shifts
      .filter((s) => {
        const day = new Date(s.startDateTime).getDay();
        return day === 0 || day === 6;
      })
      .reduce((acc, shift) => {
        let effectiveEnd = new Date(shift.endDateTime);
        while (effectiveEnd.getTime() <= new Date(shift.startDateTime).getTime()) {
          effectiveEnd = new Date(effectiveEnd.getTime() + 24 * 60 * 60 * 1000);
        }
        const hours = (effectiveEnd.getTime() - new Date(shift.startDateTime).getTime()) / (1000 * 60 * 60);
        return acc + hours;
      }, 0);

    // Compute payments per shift and total payment
    const rateMap = await buildRateMap();

    // Preload holidays for the month (includes recurrent holidays)
    const holidays = await prisma.holiday.findMany({
      where: {
        OR: [
          { isRecurrent: true },
          { date: { gte: startOfMonth, lte: endOfMonth } },
        ],
      },
    });
    const pad = (n: number) => String(n).padStart(2, '0');
    const holidaySet = new Set<string>();
    const recurringSet = new Set<string>();
    holidays.forEach((h) => {
      const d = new Date(h.date);
      if (h.isRecurrent) {
        recurringSet.add(`${pad(d.getMonth() + 1)}-${pad(d.getDate())}`);
      } else {
        holidaySet.add(`${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`);
      }
    });

    const shiftsPayment = shifts.reduce((acc, shift) => {
      try {
        // Normalize end in case it's earlier than start
        let effectiveEnd = new Date(shift.endDateTime);
        while (effectiveEnd.getTime() <= new Date(shift.startDateTime).getTime()) {
          effectiveEnd = new Date(effectiveEnd.getTime() + 24 * 60 * 60 * 1000);
        }
        const isHolidayOrWeekend = shift.dayCategory === 'WEEKEND' || shift.dayCategory === 'HOLIDAY';
        const { totalAmount } = calculateShiftPaymentFromRates(rateMap, shift.startDateTime, effectiveEnd, isHolidayOrWeekend, holidaySet, recurringSet);
        return acc + totalAmount;
      } catch (e) {
        return acc;
      }
    }, 0);

    // Get external hours for this doctor in the same period
    const externalHoursData = await prisma.externalHours.findMany({
      where: {
        doctorId,
        date: {
          gte: startOfMonth,
          lte: endOfMonth,
        },
      },
    });

    const externalHoursTotal = externalHoursData.reduce((sum, e) => sum + Number(e.hours), 0);
    const externalPayment = externalHoursData.reduce((sum, e) => sum + (Number(e.hours) * Number(e.rate)), 0);

    // Get doctor's hasDiscount status
    const doctorFull = await prisma.user.findUnique({
      where: { id: doctorId },
      select: { hasDiscount: true },
    });

    // Get active discount
    const activeDiscount = await prisma.discount.findFirst({
      where: { isActive: true },
      orderBy: { validFrom: 'desc' },
    });
    const discountAmount = activeDiscount ? Number(activeDiscount.amount) : 0;

    // Calculate bruto and final payment
    const brutoPayment = shiftsPayment + externalPayment;
    const hasDiscount = doctorFull?.hasDiscount || false;
    const finalPayment = hasDiscount && discountAmount > 0 
      ? Math.max(0, brutoPayment - discountAmount) 
      : brutoPayment;

    res.json({
      doctor,
      month: targetMonth + 1,
      year: targetYear,
      summary: {
        totalHours: Math.round(totalHours * 100) / 100,
        fixedHours: Math.round(fixedHours * 100) / 100,
        rotatingHours: Math.round(rotatingHours * 100) / 100,
        weekendHours: Math.round(weekendHours * 100) / 100,
        shiftCount: shifts.length,
        externalHours: Math.round(externalHoursTotal * 100) / 100,
      },
      shiftsPayment: Math.round(shiftsPayment * 100) / 100,
      externalPayment: Math.round(externalPayment * 100) / 100,
      brutoPayment: Math.round(brutoPayment * 100) / 100,
      hasDiscount,
      discountAmount: hasDiscount ? discountAmount : 0,
      finalPayment: Math.round(finalPayment * 100) / 100,
      shifts,
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Get weekend coverage
 */
export const getWeekendCoverage = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const { year, month } = req.query;

    const targetYear = year ? parseInt(year as string) : new Date().getFullYear();
    const targetMonth = month ? parseInt(month as string) - 1 : new Date().getMonth();

    const startOfMonth = new Date(targetYear, targetMonth, 1);
    const endOfMonth = new Date(targetYear, targetMonth + 1, 0, 23, 59, 59);

    const shifts = await prisma.shift.findMany({
      where: {
        startDateTime: {
          gte: startOfMonth,
          lte: endOfMonth,
        },
      },
      include: {
        doctor: {
          select: {
            id: true,
            name: true,
            specialty: true,
          },
        },
        doctors: {
          include: {
            doctor: {
              select: {
                id: true,
                name: true,
                specialty: true,
              },
            },
          },
        },
      },
      orderBy: { startDateTime: 'asc' },
    });

    // Filter weekend shifts
    const weekendShifts = shifts.filter((shift) => {
      const day = new Date(shift.startDateTime).getDay();
      return day === 0 || day === 6;
    });

    // Group by weekend
    const weekendsMap = new Map<string, typeof weekendShifts>();

    weekendShifts.forEach((shift) => {
      const date = new Date(shift.startDateTime);
      const weekKey = `${date.getFullYear()}-W${Math.ceil(date.getDate() / 7)}`;
      
      const existing = weekendsMap.get(weekKey) || [];
      existing.push(shift);
      weekendsMap.set(weekKey, existing);
    });

    const weekends = Array.from(weekendsMap.entries()).map(([key, wShifts]) => ({
      weekKey: key,
      shifts: wShifts,
      totalShifts: wShifts.length,
      assignedShifts: wShifts.filter((s) => (s.doctors && s.doctors.length > 0) || s.doctorId).length,
    }));

    res.json({
      month: targetMonth + 1,
      year: targetYear,
      weekends,
      totalWeekendShifts: weekendShifts.length,
      assignedWeekendShifts: weekendShifts.filter((s) => (s.doctors && s.doctors.length > 0) || s.doctorId).length,
    });
  } catch (error) {
    next(error);
  }
};
