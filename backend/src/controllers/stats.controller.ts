import { Request, Response, NextFunction } from 'express';
import prisma from '../config/database';
import { DoctorHoursSummary, DailyCoverage } from '../types';

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

    // Calculate hours per doctor
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
        } else {
          doctorHoursMap.set(shift.doctorId, {
            doctorId: shift.doctorId,
            doctorName: shift.doctor.name,
            specialty: shift.doctor.specialty,
            totalHours: hours,
            shiftCount: 1,
            fixedShifts: shift.type === 'FIXED' ? 1 : 0,
            rotatingShifts: shift.type === 'ROTATING' ? 1 : 0,
          });
        }
      }
    });

    const doctorsSummary = Array.from(doctorHoursMap.values()).sort(
      (a, b) => b.totalHours - a.totalHours
    );

    res.json({
      month: targetMonth + 1,
      year: targetYear,
      totalShifts,
      assignedShifts,
      availableShifts,
      totalHours: Math.round(totalHours * 100) / 100,
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
