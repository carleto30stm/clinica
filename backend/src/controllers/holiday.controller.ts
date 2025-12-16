import { Request, Response, NextFunction } from 'express';
import prisma from '../config/database';
import { formatArgentinaDate, parseArgentinaDate } from '../utils/dateHelpers';
import { CreateHolidayRequest, UpdateHolidayRequest } from '../types';

/**
 * Get all holidays
 */
export const getAll = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const { year } = req.query;

    let where = {};
    if (year) {
      const yearNum = parseInt(year as string);
      where = {
        OR: [
          {
            date: {
              gte: new Date(Date.UTC(yearNum, 0, 1)),
              lt: new Date(Date.UTC(yearNum + 1, 0, 1)),
            },
            isRecurrent: false,
          },
          {
            isRecurrent: true,
          },
        ],
      };
    }

    const holidays = await prisma.holiday.findMany({
      where,
      orderBy: { date: 'asc' },
    });

    // Normalize date to YYYY-MM-DD (Argentina timezone) before returning
    const normalized = holidays.map((h) => ({
      ...h,
      date: formatArgentinaDate(new Date(h.date)),
    }));

    res.json({ holidays: normalized });
  } catch (error) {
    next(error);
  }
};

/**
 * Get holiday by ID
 */
export const getById = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const { id } = req.params;

    const holiday = await prisma.holiday.findUnique({
      where: { id },
    });

    if (!holiday) {
      res.status(404).json({ error: 'Feriado no encontrado' });
      return;
    }

    // Normalize date
    const normalizedHoliday = { ...holiday, date: formatArgentinaDate(new Date(holiday.date)) };
    res.json({ holiday: normalizedHoliday });
  } catch (error) {
    next(error);
  }
};

/**
 * Create new holiday (admin only)
 */
export const create = async (
  req: Request<object, object, CreateHolidayRequest>,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const { date, name, isRecurrent = false } = req.body;

    // Parse date as UTC midnight for consistent storage
    const holidayDate = parseArgentinaDate(date);

    // Check for duplicate holiday on the same date (compare UTC dates)
    const nextDay = new Date(Date.UTC(holidayDate.getUTCFullYear(), holidayDate.getUTCMonth(), holidayDate.getUTCDate() + 1));
    const existing = await prisma.holiday.findFirst({
      where: {
        date: {
          gte: holidayDate,
          lt: nextDay,
        },
      },
    });

    if (existing) {
      res.status(400).json({ error: 'Ya existe un feriado en esta fecha' });
      return;
    }

    const holiday = await prisma.holiday.create({
      data: {
        date: holidayDate,
        name,
        isRecurrent,
      },
    });

    const normalizedCreated = { ...holiday, date: formatArgentinaDate(new Date(holiday.date)) };
    res.status(201).json({ holiday: normalizedCreated });
  } catch (error) {
    next(error);
  }
};

/**
 * Update holiday (admin only)
 */
export const update = async (
  req: Request<{ id: string }, object, UpdateHolidayRequest>,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const { id } = req.params;
    const { date, name, isRecurrent } = req.body;

    const existingHoliday = await prisma.holiday.findUnique({ where: { id } });

    if (!existingHoliday) {
      res.status(404).json({ error: 'Feriado no encontrado' });
      return;
    }

    const holiday = await prisma.holiday.update({
      where: { id },
      data: {
        ...(date && { date: parseArgentinaDate(date) }),
        ...(name && { name }),
        ...(isRecurrent !== undefined && { isRecurrent }),
      },
    });

    const normalizedUpdated = { ...holiday, date: formatArgentinaDate(new Date(holiday.date)) };
    res.json({ holiday: normalizedUpdated });
  } catch (error) {
    next(error);
  }
};

/**
 * Delete holiday (admin only)
 */
export const remove = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const { id } = req.params;

    await prisma.holiday.delete({ where: { id } });

    res.json({ message: 'Feriado eliminado exitosamente' });
  } catch (error) {
    next(error);
  }
};

/**
 * Bulk create holidays (admin only)
 * Useful for importing a year's worth of holidays
 */
export const bulkCreate = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const { holidays: holidaysData } = req.body as { holidays: CreateHolidayRequest[] };

    const createdHolidays = await prisma.$transaction(
      holidaysData.map((holiday) =>
        prisma.holiday.create({
          data: {
            date: parseArgentinaDate(holiday.date),
            name: holiday.name,
            isRecurrent: holiday.isRecurrent ?? false,
          },
        })
      )
    );

    const normalizedCreatedHolidays = createdHolidays.map((h) => ({ ...h, date: formatArgentinaDate(new Date(h.date)) }));
    res.status(201).json({
      holidays: normalizedCreatedHolidays,
      message: `${createdHolidays.length} feriados creados exitosamente`,
    });
  } catch (error) {
    next(error);
  }
};
