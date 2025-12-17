import { Request, Response, NextFunction } from 'express';
import prisma from '../config/database';
import { formatArgentinaDate, formatArgentinaDateFromDB, parseArgentinaDate, startOfDayArgentina, endOfDayArgentina } from '../utils/dateHelpers';
import { CreateHolidayRequest, UpdateHolidayRequest } from '../types';

/**
 * Crea o actualiza un turno autoasignable para un feriado con requiredDoctors > 0
 */
const syncHolidayShift = async (
  holidayId: string,
  holidayDate: Date,
  holidayName: string,
  requiredDoctors: number,
  adminId?: string
): Promise<void> => {
  const dayStart = startOfDayArgentina(holidayDate);
  const dayEnd = endOfDayArgentina(holidayDate);

  // Buscar turno existente para este feriado
  const existingShift = await prisma.shift.findFirst({
    where: { holidayId },
  });

  if (requiredDoctors > 0) {
    // Crear o actualizar turno
    if (existingShift) {
      await prisma.shift.update({
        where: { id: existingShift.id },
        data: {
          startDateTime: dayStart,
          endDateTime: dayEnd,
          requiredDoctors,
          dayCategory: 'HOLIDAY',
        },
      });
    } else {
      await prisma.shift.create({
        data: {
          startDateTime: dayStart,
          endDateTime: dayEnd,
          type: 'ROTATING',
          dayCategory: 'HOLIDAY',
          selfAssignable: true,
          isAvailable: true,
          requiredDoctors,
          holidayId,
          notes: `Guardia de feriado: ${holidayName}`,
          createdByAdminId: adminId!,
        },
      });
    }
  } else {
    // Si requiredDoctors es 0, eliminar el turno asociado si existe
    if (existingShift) {
      // Primero eliminar asignaciones de doctores
      await prisma.shiftDoctor.deleteMany({
        where: { shiftId: existingShift.id },
      });
      await prisma.shift.delete({
        where: { id: existingShift.id },
      });
    }
  }
};

/**
 * Elimina el turno asociado a un feriado
 */
const deleteHolidayShift = async (holidayId: string): Promise<void> => {
  const existingShift = await prisma.shift.findFirst({
    where: { holidayId },
  });

  if (existingShift) {
    // Primero eliminar asignaciones de doctores
    await prisma.shiftDoctor.deleteMany({
      where: { shiftId: existingShift.id },
    });
    await prisma.shift.delete({
      where: { id: existingShift.id },
    });
  }
};

/**
 * Recalcula el dayCategory de los turnos que coinciden con una fecha de feriado.
 * - Si se agrega un feriado, los turnos WEEKDAY en esa fecha pasan a HOLIDAY.
 * - Si se elimina un feriado, los turnos HOLIDAY en esa fecha (que no sean weekend) pasan a WEEKDAY.
 */
const recalculateShiftsDayCategory = async (
  holidayDate: Date,
  action: 'add' | 'remove' | 'update',
  oldDate?: Date
): Promise<number> => {
  const dayStart = startOfDayArgentina(holidayDate);
  const dayEnd = endOfDayArgentina(holidayDate);

  if (action === 'add') {
    // Marcar turnos de ese día como HOLIDAY (si eran WEEKDAY)
    const result = await prisma.shift.updateMany({
      where: {
        startDateTime: { gte: dayStart, lte: dayEnd },
        dayCategory: 'WEEKDAY',
      },
      data: { dayCategory: 'HOLIDAY' },
    });
    return result.count;
  }

  if (action === 'remove') {
    // Revertir turnos de ese día a WEEKDAY (si no es fin de semana)
    const dayOfWeek = holidayDate.getDay();
    const isWeekend = dayOfWeek === 0 || dayOfWeek === 6;
    
    if (!isWeekend) {
      const result = await prisma.shift.updateMany({
        where: {
          startDateTime: { gte: dayStart, lte: dayEnd },
          dayCategory: 'HOLIDAY',
        },
        data: { dayCategory: 'WEEKDAY' },
      });
      return result.count;
    }
    return 0;
  }

  if (action === 'update' && oldDate) {
    // Revertir la fecha anterior y aplicar la nueva
    let count = 0;
    
    // Revertir fecha anterior (si no es weekend)
    const oldDayStart = startOfDayArgentina(oldDate);
    const oldDayEnd = endOfDayArgentina(oldDate);
    const oldDayOfWeek = oldDate.getDay();
    const oldIsWeekend = oldDayOfWeek === 0 || oldDayOfWeek === 6;
    
    if (!oldIsWeekend) {
      // Verificar si hay otro feriado en la fecha anterior
      const otherHolidayOnOldDate = await prisma.holiday.findFirst({
        where: {
          date: { gte: oldDayStart, lt: oldDayEnd },
        },
      });
      
      if (!otherHolidayOnOldDate) {
        const revert = await prisma.shift.updateMany({
          where: {
            startDateTime: { gte: oldDayStart, lte: oldDayEnd },
            dayCategory: 'HOLIDAY',
          },
          data: { dayCategory: 'WEEKDAY' },
        });
        count += revert.count;
      }
    }
    
    // Aplicar nueva fecha
    const add = await prisma.shift.updateMany({
      where: {
        startDateTime: { gte: dayStart, lte: dayEnd },
        dayCategory: 'WEEKDAY',
      },
      data: { dayCategory: 'HOLIDAY' },
    });
    count += add.count;
    
    return count;
  }

  return 0;
};

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
      // Use UTC-aware formatter for DB dates to avoid server-timezone dependent shifts
      date: formatArgentinaDateFromDB(h.date),
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

    // Normalize date (holiday.date is already a Date object from Prisma)
    const normalizedHoliday = { ...holiday, date: formatArgentinaDateFromDB(holiday.date) };
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

    // Check for duplicate holiday on the same date (compare by next day)
    const nextDay = new Date(holidayDate.getTime() + 24 * 60 * 60 * 1000);
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

    const requiredDoctors = req.body.requiredDoctors ?? 0;
    const holiday = await prisma.holiday.create({
      data: {
        date: holidayDate,
        name,
        isRecurrent,
        requiredDoctors,
      },
    });

    // Recalcular dayCategory de turnos afectados
    const updatedShiftsCount = await recalculateShiftsDayCategory(holidayDate, 'add');
    console.log(`Feriado creado: ${updatedShiftsCount} turnos actualizados a HOLIDAY`);

    // Crear turno autoasignable si requiredDoctors > 0
    const adminId = req.user?.id;
    await syncHolidayShift(holiday.id, holidayDate, name, requiredDoctors, adminId);

    // Return the date normalized from the input (holidayDate) to avoid timezone shifts
    const normalizedCreated = { ...holiday, date: formatArgentinaDate(holidayDate) };
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

    // Normalize old date coming from DB into Argentina-local date
    const oldDate = parseArgentinaDate(formatArgentinaDateFromDB(existingHoliday.date));
    const newDate = date ? parseArgentinaDate(date) : oldDate;

    const updatedRequiredDoctors = req.body.requiredDoctors !== undefined 
      ? req.body.requiredDoctors 
      : existingHoliday.requiredDoctors;
    const updatedName = name || existingHoliday.name;

    const holiday = await prisma.holiday.update({
      where: { id },
      data: {
        ...(date && { date: newDate }),
        ...(name && { name }),
        ...(isRecurrent !== undefined && { isRecurrent }),
        ...(req.body.requiredDoctors !== undefined && { requiredDoctors: req.body.requiredDoctors }),
      },
    });

    // Si la fecha cambió, recalcular dayCategory de turnos afectados
    if (date && oldDate.getTime() !== newDate.getTime()) {
      const updatedShiftsCount = await recalculateShiftsDayCategory(newDate, 'update', oldDate);
      console.log(`Feriado actualizado: ${updatedShiftsCount} turnos recalculados`);
    }

    // Sincronizar turno autoasignable
    const adminId = req.user?.id;
    await syncHolidayShift(id, newDate, updatedName, updatedRequiredDoctors, adminId);

    // Return the date normalized from the parsed newDate to avoid timezone shifts
    const normalizedUpdated = { ...holiday, date: formatArgentinaDate(newDate) };
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

    // Obtener el feriado antes de eliminarlo para recalcular turnos
    const holiday = await prisma.holiday.findUnique({ where: { id } });
    
    if (!holiday) {
      res.status(404).json({ error: 'Feriado no encontrado' });
      return;
    }

    // Eliminar el turno asociado primero (por FK constraint)
    await deleteHolidayShift(id);

    await prisma.holiday.delete({ where: { id } });

    // Recalcular dayCategory de turnos afectados
    // Normalize stored holiday date into Argentina-local date for recalculation
    const holidayDate = parseArgentinaDate(formatArgentinaDateFromDB(holiday.date));
    const updatedShiftsCount = await recalculateShiftsDayCategory(holidayDate, 'remove');
    console.log(`Feriado eliminado: ${updatedShiftsCount} turnos revertidos a WEEKDAY`);

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
            requiredDoctors: holiday.requiredDoctors ?? 0,
          },
        })
      )
    );

    // Use the original input dates to normalize returned holidays to avoid timezone shifts
    const normalizedCreatedHolidays = createdHolidays.map((h, i) => ({ ...h, date: formatArgentinaDate(parseArgentinaDate(holidaysData[i].date)) }));
    res.status(201).json({
      holidays: normalizedCreatedHolidays,
      message: `${createdHolidays.length} feriados creados exitosamente`,
    });
  } catch (error) {
    next(error);
  }
};
