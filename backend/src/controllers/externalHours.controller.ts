import { Request, Response, NextFunction } from 'express';
import prisma from '../config/database';
import { parseArgentinaDate } from '../utils/dateHelpers';

/**
 * Get all external hours (admin only)
 * Query params: month, year, doctorId
 */
export const getAll = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const { month, year, doctorId } = req.query;

    const where: any = {};

    // Filter by doctor
    if (doctorId) {
      where.doctorId = doctorId as string;
    }

    // Filter by month/year
    if (month && year) {
      const targetMonth = parseInt(month as string);
      const targetYear = parseInt(year as string);
      const startDate = new Date(targetYear, targetMonth - 1, 1);
      const endDate = new Date(targetYear, targetMonth, 0, 23, 59, 59);
      
      where.date = {
        gte: startDate,
        lte: endDate,
      };
    }

    const externalHours = await prisma.externalHours.findMany({
      where,
      include: {
        doctor: {
          select: {
            id: true,
            name: true,
            email: true,
          },
        },
      },
      orderBy: { date: 'desc' },
    });

    res.json({ externalHours });
  } catch (error) {
    next(error);
  }
};

/**
 * Get external hours for current user (doctor)
 * Query params: month, year
 */
export const getMy = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const { month, year } = req.query;
    const userId = (req as any).user.id;

    const where: any = {
      doctorId: userId,
    };

    // Filter by month/year
    if (month && year) {
      const targetMonth = parseInt(month as string);
      const targetYear = parseInt(year as string);
      const startDate = new Date(targetYear, targetMonth - 1, 1);
      const endDate = new Date(targetYear, targetMonth, 0, 23, 59, 59);
      
      where.date = {
        gte: startDate,
        lte: endDate,
      };
    }

    const externalHours = await prisma.externalHours.findMany({
      where,
      orderBy: { date: 'desc' },
    });

    res.json({ externalHours });
  } catch (error) {
    next(error);
  }
};

/**
 * Create external hours entry (admin only)
 */
export const create = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const { doctorId, hours, rate, description, date } = req.body;

    const externalHours = await prisma.externalHours.create({
      data: {
        doctorId,
        hours,
        rate,
        description: description || null,
        date: parseArgentinaDate(date),
      },
      include: {
        doctor: {
          select: {
            id: true,
            name: true,
            email: true,
          },
        },
      },
    });

    res.status(201).json({ externalHours });
  } catch (error) {
    next(error);
  }
};

/**
 * Update external hours entry (admin only)
 */
export const update = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const { id } = req.params;
    const { hours, rate, description, date } = req.body;

    const data: any = {};
    if (hours !== undefined) data.hours = hours;
    if (rate !== undefined) data.rate = rate;
    if (description !== undefined) data.description = description || null;
    if (date !== undefined) data.date = parseArgentinaDate(date);

    const externalHours = await prisma.externalHours.update({
      where: { id },
      data,
      include: {
        doctor: {
          select: {
            id: true,
            name: true,
            email: true,
          },
        },
      },
    });

    res.json({ externalHours });
  } catch (error) {
    next(error);
  }
};

/**
 * Delete external hours entry (admin only)
 */
export const remove = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const { id } = req.params;

    await prisma.externalHours.delete({
      where: { id },
    });

    res.json({ message: 'Registro eliminado correctamente' });
  } catch (error) {
    next(error);
  }
};
