import { Request, Response, NextFunction } from 'express';
import prisma from '../config/database';
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
              gte: new Date(yearNum, 0, 1),
              lt: new Date(yearNum + 1, 0, 1),
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

    res.json({ holidays });
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

    res.json({ holiday });
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

    const holidayDate = new Date(date);

    // Check for duplicate holiday on the same date
    const existing = await prisma.holiday.findFirst({
      where: {
        date: {
          gte: new Date(holidayDate.getFullYear(), holidayDate.getMonth(), holidayDate.getDate()),
          lt: new Date(holidayDate.getFullYear(), holidayDate.getMonth(), holidayDate.getDate() + 1),
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

    res.status(201).json({ holiday });
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
        ...(date && { date: new Date(date) }),
        ...(name && { name }),
        ...(isRecurrent !== undefined && { isRecurrent }),
      },
    });

    res.json({ holiday });
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
            date: new Date(holiday.date),
            name: holiday.name,
            isRecurrent: holiday.isRecurrent ?? false,
          },
        })
      )
    );

    res.status(201).json({
      holidays: createdHolidays,
      message: `${createdHolidays.length} feriados creados exitosamente`,
    });
  } catch (error) {
    next(error);
  }
};
