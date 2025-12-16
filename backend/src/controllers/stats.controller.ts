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

    const totalShifts = shifts.length;
    const assignedShifts = shifts.filter((s) => s.doctorId).length;
    const availableShifts = shifts.filter((s) => s.isAvailable && !s.doctorId).length;

    // Calculate total hours
    const totalHours = shifts.reduce((acc, shift) => {
      const hours = (shift.endDateTime.getTime() - shift.startDateTime.getTime()) / (1000 * 60 * 60);
      return acc + hours;
    }, 0);

    // Load rates once for payment calculation
    const rateMap = await buildRateMap();

    // Calculate hours and payments per doctor
    const doctorHoursMap = new Map<string, DoctorHoursSummary>();

    shifts.forEach((shift) => {
      if (shift.doctorId && shift.doctor) {
        const hours = (shift.endDateTime.getTime() - shift.startDateTime.getTime()) / (1000 * 60 * 60);
        const existing = doctorHoursMap.get(shift.doctorId);

        if (existing) {
          existing.totalHours += hours;
          existing.shiftCount += 1;
          if (shift.type === 'FIXED') existing.fixedShifts += 1;
          else existing.rotatingShifts += 1;

          try {
            const isHolidayOrWeekend = shift.dayCategory === 'WEEKEND' || shift.dayCategory === 'HOLIDAY';
            const { totalAmount, breakdown } = calculateShiftPaymentFromRates(rateMap, shift.startDateTime, shift.endDateTime, isHolidayOrWeekend);
            existing.totalPayment = (existing.totalPayment || 0) + totalAmount;
            existing.paymentBreakdown = existing.paymentBreakdown || [];
            breakdown.forEach((b) => {
              const prev = existing.paymentBreakdown!.find((p) => p.periodType === b.type);
              if (prev) {
                prev.hours += b.hours;
                prev.amount += b.amount;
              } else {
                existing.paymentBreakdown!.push({ periodType: b.type, hours: b.hours, amount: b.amount });
              }
            });
          } catch (e) {
            // ignore calculation error
          }
        } else {
          const newEntry: DoctorHoursSummary = {
            doctorId: shift.doctorId,
            doctorName: shift.doctor.name,
            specialty: shift.doctor.specialty,
            totalHours: hours,
            shiftCount: 1,
            fixedShifts: shift.type === 'FIXED' ? 1 : 0,
            rotatingShifts: shift.type === 'ROTATING' ? 1 : 0,
            totalPayment: 0,
            paymentBreakdown: [],
            hasDiscount: shift.doctor.hasDiscount || false,
          };
          try {
            const isHolidayOrWeekend = shift.dayCategory === 'WEEKEND' || shift.dayCategory === 'HOLIDAY';
            const { totalAmount, breakdown } = calculateShiftPaymentFromRates(rateMap, shift.startDateTime, shift.endDateTime, isHolidayOrWeekend);
            newEntry.totalPayment = totalAmount;
            newEntry.paymentBreakdown = breakdown.map((b) => ({ periodType: b.type, hours: b.hours, amount: b.amount }));
          } catch (e) {
            // ignore calculation error
          }
          doctorHoursMap.set(shift.doctorId, newEntry);
        }
      }
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
      if (doctor.hasDiscount && discountAmount > 0) {
        const finalPayment = Math.max(0, (doctor.totalPayment || 0) - discountAmount);
        return {
          ...doctor,
          discountAmount,
          finalPayment,
        };
      }
      return {
        ...doctor,
        discountAmount: 0,
        finalPayment: doctor.totalPayment || 0,
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
      const assignedDayShifts = dayShifts.filter((s) => s.doctorId).length;
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

    const shifts = await prisma.shift.findMany({
      where: {
        doctorId,
        startDateTime: {
          gte: startOfMonth,
          lte: endOfMonth,
        },
      },
      orderBy: { startDateTime: 'asc' },
    });

    const totalHours = shifts.reduce((acc, shift) => {
      return acc + (shift.endDateTime.getTime() - shift.startDateTime.getTime()) / (1000 * 60 * 60);
    }, 0);

    const fixedHours = shifts
      .filter((s) => s.type === 'FIXED')
      .reduce((acc, shift) => {
        return acc + (shift.endDateTime.getTime() - shift.startDateTime.getTime()) / (1000 * 60 * 60);
      }, 0);

    const rotatingHours = shifts
      .filter((s) => s.type === 'ROTATING')
      .reduce((acc, shift) => {
        return acc + (shift.endDateTime.getTime() - shift.startDateTime.getTime()) / (1000 * 60 * 60);
      }, 0);

    const weekendHours = shifts
      .filter((s) => {
        const day = new Date(s.startDateTime).getDay();
        return day === 0 || day === 6;
      })
      .reduce((acc, shift) => {
        return acc + (shift.endDateTime.getTime() - shift.startDateTime.getTime()) / (1000 * 60 * 60);
      }, 0);

    // Compute payments per shift and total payment
    const rateMap = await buildRateMap();
    const totalPayment = shifts.reduce((acc, shift) => {
      try {
        const isHolidayOrWeekend = shift.dayCategory === 'WEEKEND' || shift.dayCategory === 'HOLIDAY';
        const { totalAmount } = calculateShiftPaymentFromRates(rateMap, shift.startDateTime, shift.endDateTime, isHolidayOrWeekend);
        return acc + totalAmount;
      } catch (e) {
        return acc;
      }
    }, 0);

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
      },
      totalPayment: Math.round(totalPayment * 100) / 100,
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
      assignedShifts: wShifts.filter((s) => s.doctorId).length,
    }));

    res.json({
      month: targetMonth + 1,
      year: targetYear,
      weekends,
      totalWeekendShifts: weekendShifts.length,
      assignedWeekendShifts: weekendShifts.filter((s) => s.doctorId).length,
    });
  } catch (error) {
    next(error);
  }
};
