import { Request, Response, NextFunction } from 'express';
import prisma from '../config/database';
import { CreateShiftRequest, UpdateShiftRequest, DayCategory, AssignmentStatus } from '../types';
import { ROLES } from '../config/constants';
import { isWeekend } from '../utils/formatters';
import { parseArgentinaDate } from '../utils/dateHelpers';

/**
 * Calculate day category based on date
 * Checks if the date is a weekend or a holiday
 */
const calculateDayCategory = async (date: Date): Promise<DayCategory> => {
  // Check if it's a weekend (Saturday = 6, Sunday = 0)
  if (isWeekend(date)) {
    return 'WEEKEND';
  }

  // Check if it's a holiday
  const holiday = await prisma.holiday.findFirst({
    where: {
      OR: [
        // Exact date match
        {
          date: {
            gte: new Date(date.getFullYear(), date.getMonth(), date.getDate()),
            lt: new Date(date.getFullYear(), date.getMonth(), date.getDate() + 1),
          },
          isRecurrent: false,
        },
        // Recurrent holiday (same month and day)
        {
          isRecurrent: true,
        },
      ],
    },
  });

  // For recurrent holidays, check month and day
  if (holiday?.isRecurrent) {
    const holidayDate = new Date(holiday.date);
    if (
      holidayDate.getMonth() === date.getMonth() &&
      holidayDate.getDate() === date.getDate()
    ) {
      return 'HOLIDAY';
    }
  } else if (holiday) {
    return 'HOLIDAY';
  }

  return 'WEEKDAY';
};

/**
 * Get all shifts with optional filters
 */
export const getAll = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const { startDate, endDate, doctorId, type, isAvailable } = req.query;

    const where: Record<string, unknown> = {};

    const parseMaybeArgentina = (s?: string | string[]) => {
      if (!s) return undefined;
      const str = Array.isArray(s) ? s[0] : s;
      // If format is YYYY-MM-DD (len == 10) parse as Argentina date (midnight local)
      if (/^\d{4}-\d{2}-\d{2}$/.test(str)) return parseArgentinaDate(str);
      return new Date(str);
    };

    const parsedStart = parseMaybeArgentina(startDate as string | undefined);
    const parsedEnd = parseMaybeArgentina(endDate as string | undefined);

    if (parsedStart && parsedEnd) {
      where.startDateTime = { gte: parsedStart, lte: parsedEnd };
    } else if (parsedStart) {
      where.startDateTime = { gte: parsedStart };
    } else if (parsedEnd) {
      where.endDateTime = { lte: parsedEnd };
    }

    if (doctorId) {
      // Filter by doctor - check both legacy doctorId and new doctors relation
      where.OR = [
        { doctorId: doctorId },
        { doctors: { some: { doctorId: doctorId as string } } },
      ];
    }

    if (type) {
      where.type = type;
    }

    if (isAvailable !== undefined) {
      where.isAvailable = isAvailable === 'true';
    }

    const shifts = await prisma.shift.findMany({
      where,
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
          orderBy: { assignedAt: 'asc' },
        },
        createdByAdmin: {
          select: {
            id: true,
            name: true,
          },
        },
      },
      orderBy: { startDateTime: 'asc' },
    });

    res.json({ shifts });
  } catch (error) {
    next(error);
  }
};

/**
 * Get shift by ID
 */
export const getById = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const { id } = req.params;

    const shift = await prisma.shift.findUnique({
      where: { id },
      include: {
        doctor: {
          select: {
            id: true,
            name: true,
            specialty: true,
            phone: true,
          },
        },
        createdByAdmin: {
          select: {
            id: true,
            name: true,
          },
        },
      },
    });

    if (!shift) {
      res.status(404).json({ error: 'Turno no encontrado' });
      return;
    }

    res.json({ shift });
  } catch (error) {
    next(error);
  }
};

/**
 * Create new shift (admin only)
 */
export const create = async (
  req: Request<object, object, CreateShiftRequest>,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const { startDateTime, endDateTime, type, selfAssignable, requiredDoctors, doctorId, doctorIds, notes, dayCategory: providedDayCategory } = req.body;

    // Validate dates
    const start = new Date(startDateTime);
    const end = new Date(endDateTime);

    if (end <= start) {
      res.status(400).json({ error: 'La fecha de fin debe ser posterior a la fecha de inicio' });
      return;
    }

    // Calculate day category if not provided
    const dayCategory = providedDayCategory || await calculateDayCategory(start);

    // Determine if shift should be self-assignable
    // By default, ROTATING shifts on weekends/holidays are self-assignable
    const isSelfAssignable = selfAssignable !== undefined 
      ? selfAssignable 
      : (type === 'ROTATING' && (dayCategory === 'WEEKEND' || dayCategory === 'HOLIDAY'));

    // Determine doctors to assign (support both doctorId and doctorIds)
    const doctorsToAssign = doctorIds && doctorIds.length > 0 ? doctorIds : (doctorId ? [doctorId] : []);

    // Determine initial assignment status
    let assignmentStatus: AssignmentStatus = 'AVAILABLE';
    if (doctorsToAssign.length > 0) {
      assignmentStatus = 'ADMIN_ASSIGNED';
    }

    // Validate doctorIds exist and are active if provided
    if (doctorsToAssign.length > 0) {
      const existingDoctors = await prisma.user.findMany({
        where: { id: { in: doctorsToAssign }, role: 'DOCTOR', isActive: true },
        select: { id: true },
      });
      if (existingDoctors.length !== doctorsToAssign.length) {
        const found = new Set(existingDoctors.map((d) => d.id));
        const missing = doctorsToAssign.filter((id) => !found.has(id));
        res.status(404).json({ error: `Médicos no encontrados o inactivos: ${missing.join(', ')}` });
        return;
      }
    }

    // Check for overlapping shifts for any of the specified doctors
    if (doctorsToAssign.length > 0) {
      const overlapping = await prisma.shift.findFirst({
        where: {
          AND: [
            { startDateTime: { lt: end } },
            { endDateTime: { gt: start } },
            {
              OR: [
                { doctorId: { in: doctorsToAssign } },
                { doctors: { some: { doctorId: { in: doctorsToAssign } } } },
              ],
            },
          ],
        },
      });

      if (overlapping) {
        res.status(400).json({ error: 'Alguno de los médicos ya tiene un turno asignado en ese horario' });
        return;
      }
    }

    // Create shift and ShiftDoctor entries in a transaction
    const createdShift = await prisma.$transaction(async (tx) => {
      const s = await tx.shift.create({
        data: {
          startDateTime: start,
          endDateTime: end,
          type,
          dayCategory,
          selfAssignable: isSelfAssignable,
          assignmentStatus,
          isAvailable: doctorsToAssign.length === 0,
          requiredDoctors: requiredDoctors || 1,
          doctorId: doctorsToAssign.length > 0 ? doctorsToAssign[0] : null,
          notes,
          createdByAdminId: req.user!.id,
        },
      });

      // Create ShiftDoctor entries for multi-doctor support
      if (doctorsToAssign.length > 0) {
        await tx.shiftDoctor.createMany({
          data: doctorsToAssign.map((did) => ({
            shiftId: s.id,
            doctorId: did,
            assignedBy: req.user!.id,
            isSelfAssigned: false,
          })),
        });
      }

      return s;
    });

    // Re-fetch the shift to include doctors relation
    const shiftWithDoctors = await prisma.shift.findUnique({
      where: { id: createdShift.id },
      include: {
        doctor: { select: { id: true, name: true, specialty: true } },
        doctors: {
          include: { doctor: { select: { id: true, name: true, specialty: true } } },
          orderBy: { assignedAt: 'asc' },
        },
        createdByAdmin: { select: { id: true, name: true } },
      },
    });

    // Log the action
    await prisma.auditLog.create({
      data: {
        action: 'SHIFT_CREATED',
        userId: req.user!.id,
        shiftId: createdShift.id,
        details: JSON.stringify({ type, dayCategory, doctorId, doctorIds }),
      },
    });

    res.status(201).json({ shift: shiftWithDoctors });
  } catch (error) {
    next(error);
  }
};

/**
 * Update shift (admin only or doctor with restrictions)
 */
export const update = async (
  req: Request<{ id: string }, object, UpdateShiftRequest>,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const { id } = req.params;
    const { startDateTime, endDateTime, type, dayCategory, selfAssignable, assignmentStatus, doctorId, doctorIds, requiredDoctors, notes } = req.body;

    const existingShift = await prisma.shift.findUnique({ where: { id } });

    if (!existingShift) {
      res.status(404).json({ error: 'Turno no encontrado' });
      return;
    }

    // Check if user is a doctor trying to modify a self-assigned shift
    const isDoctor = req.user!.role === ROLES.DOCTOR;
    if (isDoctor) {
      // Doctors cannot modify shifts that are SELF_ASSIGNED (locked)
      if (existingShift.assignmentStatus === 'SELF_ASSIGNED') {
        res.status(403).json({ 
          error: 'No puedes modificar un turno que ya te has auto-asignado. Contacta al administrador.' 
        });
        return;
      }
      // Doctors can only unassign themselves from available shifts
      // They cannot change other properties
      if (doctorId === null && existingShift.doctorId === req.user!.id) {
        // Allow unassignment only if not self-assigned
        const shift = await prisma.shift.update({
          where: { id },
          data: {
            doctorId: null,
            isAvailable: true,
            assignmentStatus: 'AVAILABLE',
          },
        });
        
        await prisma.auditLog.create({
          data: {
            action: 'SHIFT_UNASSIGNED',
            userId: req.user!.id,
            shiftId: id,
            details: JSON.stringify({ selfUnassigned: true }),
          },
        });

        res.json({ shift, message: 'Turno liberado exitosamente' });
        return;
      }
      
      res.status(403).json({ error: 'No tienes permisos para modificar este turno' });
      return;
    }

    // Admin logic continues here
    const start = startDateTime ? new Date(startDateTime) : existingShift.startDateTime;
    const end = endDateTime ? new Date(endDateTime) : existingShift.endDateTime;

    if (end <= start) {
      res.status(400).json({ error: 'La fecha de fin debe ser posterior a la fecha de inicio' });
      return;
    }

    // Calculate new day category if date changed
    let newDayCategory = dayCategory;
    if (startDateTime && !dayCategory) {
      newDayCategory = await calculateDayCategory(start);
    }

    // Check for overlapping shifts if doctor is being assigned
    const newDoctorId = doctorId !== undefined ? doctorId : existingShift.doctorId;
    if (newDoctorId) {
      const overlapping = await prisma.shift.findFirst({
        where: {
          id: { not: id },
          doctorId: newDoctorId,
          OR: [
            {
              startDateTime: { lt: end },
              endDateTime: { gt: start },
            },
          ],
        },
      });

      if (overlapping) {
        res.status(400).json({ error: 'El médico ya tiene un turno asignado en ese horario' });
        return;
      }
    }

    // Determine new assignment status
    let newAssignmentStatus = assignmentStatus;
    if (doctorId !== undefined && !assignmentStatus) {
      newAssignmentStatus = doctorId ? 'ADMIN_ASSIGNED' : 'AVAILABLE';
    }

    // Handle multiple doctors via doctorIds
    if (doctorIds !== undefined && Array.isArray(doctorIds)) {
      // Check for duplicate doctors in the request
      const uniqueDoctorIds = [...new Set(doctorIds)];
      if (uniqueDoctorIds.length !== doctorIds.length) {
        res.status(400).json({ error: 'No se puede asignar el mismo médico más de una vez al turno' });
        return;
      }

      // Check for overlapping shifts for each doctor
      for (const docId of uniqueDoctorIds) {
        const overlapping = await prisma.shift.findFirst({
          where: {
            id: { not: id },
            OR: [
              { doctorId: docId },
              { doctors: { some: { doctorId: docId } } },
            ],
            startDateTime: { lt: end },
            endDateTime: { gt: start },
          },
        });
        if (overlapping) {
          const doctor = await prisma.user.findUnique({ where: { id: docId }, select: { name: true } });
          res.status(400).json({ error: `El médico ${doctor?.name || docId} ya tiene un turno asignado en ese horario` });
          return;
        }
      }

      // Remove all existing doctor assignments and re-add
      await prisma.shiftDoctor.deleteMany({ where: { shiftId: id } });
      
      if (uniqueDoctorIds.length > 0) {
        await prisma.shiftDoctor.createMany({
          data: uniqueDoctorIds.map(docId => ({
            shiftId: id,
            doctorId: docId,
            isSelfAssigned: false,
          })),
        });
      }
    }

    const shift = await prisma.shift.update({
      where: { id },
      data: {
        ...(startDateTime && { startDateTime: start }),
        ...(endDateTime && { endDateTime: end }),
        ...(type && { type }),
        ...(newDayCategory && { dayCategory: newDayCategory }),
        ...(selfAssignable !== undefined && { selfAssignable }),
        ...(requiredDoctors !== undefined && { requiredDoctors }),
        ...(newAssignmentStatus && { assignmentStatus: newAssignmentStatus }),
        ...(doctorId !== undefined && { 
          doctorId, 
          isAvailable: doctorId === null,
        }),
        ...(notes !== undefined && { notes }),
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
          orderBy: { assignedAt: 'asc' },
        },
      },
    });

    // Log the action
    await prisma.auditLog.create({
      data: {
        action: 'SHIFT_UPDATED',
        userId: req.user!.id,
        shiftId: id,
        details: JSON.stringify({ changes: req.body }),
      },
    });

    res.json({ shift });
  } catch (error) {
    next(error);
  }
};

/**
 * Delete shift (admin only)
 */
export const remove = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const { id } = req.params;

      const existingShift = await prisma.shift.findUnique({ where: { id } });
      if (!existingShift) {
        res.status(404).json({ error: 'Turno no encontrado' });
        return;
      }

      // Log the action (do not set shiftId on delete to avoid FK issues; store info in details)
      await prisma.auditLog.create({
        data: {
          action: 'SHIFT_DELETED',
          userId: req.user!.id,
          details: JSON.stringify({ deletedShiftId: id, startDateTime: existingShift.startDateTime, endDateTime: existingShift.endDateTime, doctorId: existingShift.doctorId }),
        },
      });

      await prisma.shift.delete({ where: { id } });
    res.json({ message: 'Turno eliminado exitosamente' });
  } catch (error) {
    // Provide clearer error messages for known Prisma errors
    // PrismaClientKnownRequestError codes: P2025 = record not found, P2003 = foreign key constraint
    if ((error as any)?.code === 'P2025') {
      res.status(404).json({ error: 'Turno no encontrado' });
      return;
    }
    if ((error as any)?.code === 'P2003') {
      res.status(400).json({ error: 'No se puede eliminar el turno debido a restricciones en la base de datos' });
      return;
    }
    next(error);
  }
};

/**
 * Self-assign available shift (doctor only)
 * Only ROTATING shifts on weekends/holidays that are marked as selfAssignable
 * Supports multiple doctors up to requiredDoctors limit
 */
export const selfAssign = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const { id } = req.params;

    // Fetch shift with current doctor assignments
    const shift = await prisma.shift.findUnique({
      where: { id },
      include: {
        doctors: {
          select: { doctorId: true },
        },
      },
    });

    if (!shift) {
      res.status(404).json({ error: 'Turno no encontrado' });
      return;
    }

    // Check if shift is available for self-assignment
    if (!shift.selfAssignable) {
      res.status(400).json({ error: 'Este turno no está disponible para auto-asignación' });
      return;
    }

    // Verify shift is ROTATING type
    if (shift.type !== 'ROTATING') {
      res.status(400).json({ error: 'Solo puedes auto-asignarte turnos rotativos' });
      return;
    }

    // Verify shift is on weekend or holiday
    if (shift.dayCategory === 'WEEKDAY') {
      res.status(400).json({ error: 'Solo puedes auto-asignarte turnos de fines de semana o feriados' });
      return;
    }

    // Check how many doctors are already assigned
    const currentDoctorCount = shift.doctors.length;
    const requiredDoctors = shift.requiredDoctors || 1;

    // Check if shift is already full
    if (currentDoctorCount >= requiredDoctors) {
      res.status(400).json({ error: 'Este turno ya tiene todos los médicos requeridos' });
      return;
    }

    // Check if doctor is already assigned to this shift
    const alreadyAssigned = shift.doctors.some((d) => d.doctorId === req.user!.id);
    if (alreadyAssigned) {
      res.status(400).json({ error: 'Ya estás asignado a este turno' });
      return;
    }

    // Check for overlapping shifts (both legacy doctorId and ShiftDoctor)
    const overlapping = await prisma.shift.findFirst({
      where: {
        startDateTime: { lt: shift.endDateTime },
        endDateTime: { gt: shift.startDateTime },
        OR: [
          { doctorId: req.user!.id },
          { doctors: { some: { doctorId: req.user!.id } } },
        ],
      },
    });

    if (overlapping) {
      res.status(400).json({ error: 'Ya tienes un turno asignado en ese horario' });
      return;
    }

    // Determine if this is the last slot
    const isLastSlot = currentDoctorCount + 1 >= requiredDoctors;

    // Create assignment and update shift in transaction
    const updatedShift = await prisma.$transaction(async (tx) => {
      // Create ShiftDoctor entry
      await tx.shiftDoctor.create({
        data: {
          shiftId: id,
          doctorId: req.user!.id,
          isSelfAssigned: true,
        },
      });

      // Update shift status
      const updated = await tx.shift.update({
        where: { id },
        data: {
          // Set legacy doctorId to first doctor if not set
          doctorId: shift.doctorId || req.user!.id,
          isAvailable: !isLastSlot,
          // Only mark as SELF_ASSIGNED and lock when fully assigned
          assignmentStatus: isLastSlot ? 'SELF_ASSIGNED' : 'AVAILABLE',
          selfAssignable: !isLastSlot, // Lock only when all slots are filled
        },
        include: {
          doctor: { select: { id: true, name: true, specialty: true } },
          doctors: {
            include: { doctor: { select: { id: true, name: true, specialty: true } } },
            orderBy: { assignedAt: 'asc' },
          },
        },
      });

      return updated;
    });

    // Log the action
    await prisma.auditLog.create({
      data: {
        action: 'SHIFT_SELF_ASSIGNED',
        userId: req.user!.id,
        shiftId: id,
        details: JSON.stringify({
          selfAssigned: true,
          dayCategory: shift.dayCategory,
          slotNumber: currentDoctorCount + 1,
          totalSlots: requiredDoctors,
          isFull: isLastSlot,
        }),
      },
    });

    const slotsRemaining = requiredDoctors - (currentDoctorCount + 1);
    const message = isLastSlot
      ? 'Turno asignado exitosamente. El turno está completo.'
      : `Turno asignado exitosamente. Quedan ${slotsRemaining} plaza(s) disponible(s).`;

    res.json({ shift: updatedShift, message });
  } catch (error) {
    next(error);
  }
};

/**
 * Get my shifts (for doctors)
 */
export const getMyShifts = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const { startDate, endDate } = req.query;

    const where: Record<string, unknown> = {
      doctorId: req.user!.id,
    };

    const parseMaybeArgentina = (s?: string | string[]) => {
      if (!s) return undefined;
      const str = Array.isArray(s) ? s[0] : s;
      if (/^\d{4}-\d{2}-\d{2}$/.test(str)) return parseArgentinaDate(str);
      return new Date(str);
    };

    const parsedStart = parseMaybeArgentina(startDate as string | undefined);
    const parsedEnd = parseMaybeArgentina(endDate as string | undefined);

    if (parsedStart && parsedEnd) {
      where.startDateTime = { gte: parsedStart, lte: parsedEnd };
    } else if (parsedStart) {
      where.startDateTime = { gte: parsedStart };
    }

    const shifts = await prisma.shift.findMany({
      where,
      orderBy: { startDateTime: 'asc' },
    });

    res.json({ shifts });
  } catch (error) {
    next(error);
  }
};

/**
 * Get available shifts (for doctors to self-assign)
 * Only returns ROTATING shifts on weekends/holidays that are selfAssignable
 * Filters out shifts that are already full (doctors.length >= requiredDoctors)
 */
export const getAvailable = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const { startDate, endDate } = req.query;

    const where: Record<string, unknown> = {
      selfAssignable: true,
      type: 'ROTATING',
      dayCategory: { in: ['WEEKEND', 'HOLIDAY'] },
      startDateTime: { gte: new Date() }, // Only future shifts
    };

    const parseMaybeArgentina2 = (s?: string | string[]) => {
      if (!s) return undefined;
      const str = Array.isArray(s) ? s[0] : s;
      if (/^\d{4}-\d{2}-\d{2}$/.test(str)) return parseArgentinaDate(str);
      return new Date(str);
    };

    const parsedStart2 = parseMaybeArgentina2(startDate as string | undefined);
    const parsedEnd2 = parseMaybeArgentina2(endDate as string | undefined);

    if (parsedStart2 && parsedEnd2) {
      where.startDateTime = { gte: parsedStart2, lte: parsedEnd2 };
    }

    const shifts = await prisma.shift.findMany({
      where,
      orderBy: { startDateTime: 'asc' },
      include: {
        doctors: {
          include: {
            doctor: {
              select: { id: true, name: true, specialty: true },
            },
          },
          orderBy: { assignedAt: 'asc' },
        },
        holiday: {
          select: {
            id: true,
            name: true,
          },
        },
      },
    });

    // Filter out shifts that are already full and check if current user is already assigned
    const userId = req.user!.id;
    const availableShifts = shifts.filter((shift) => {
      const currentCount = shift.doctors.length;
      const required = shift.requiredDoctors || 1;
      const hasSpace = currentCount < required;
      const alreadyAssigned = shift.doctors.some((d) => d.doctorId === userId);
      return hasSpace && !alreadyAssigned;
    });

    // Add computed fields for frontend
    const shiftsWithSlotInfo = availableShifts.map((shift) => ({
      ...shift,
      assignedCount: shift.doctors.length,
      slotsAvailable: (shift.requiredDoctors || 1) - shift.doctors.length,
    }));

    res.json({ shifts: shiftsWithSlotInfo });
  } catch (error) {
    next(error);
  }
};

/**
 * Bulk create shifts (admin only)
 * Automatically calculates dayCategory and sets selfAssignable
 */
export const bulkCreate = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const { shifts: shiftsData } = req.body as { shifts: CreateShiftRequest[] };

    // Process each shift with calculated day categories
    const shiftsWithCategories = await Promise.all(
      shiftsData.map(async (shift) => {
        const startDate = new Date(shift.startDateTime);
        const dayCategory = shift.dayCategory || await calculateDayCategory(startDate);
        const isSelfAssignable = shift.selfAssignable !== undefined
          ? shift.selfAssignable
          : (shift.type === 'ROTATING' && (dayCategory === 'WEEKEND' || dayCategory === 'HOLIDAY'));

        return {
          startDateTime: startDate,
          endDateTime: new Date(shift.endDateTime),
          type: shift.type,
          dayCategory,
          selfAssignable: isSelfAssignable,
          assignmentStatus: shift.doctorId ? 'ADMIN_ASSIGNED' as const : 'AVAILABLE' as const,
          isAvailable: !shift.doctorId,
          requiredDoctors: shift.requiredDoctors || 1,
          doctorId: shift.doctorId,
          notes: shift.notes,
          createdByAdminId: req.user!.id,
        };
      })
    );

    const createdShifts = await prisma.$transaction(
      shiftsWithCategories.map((shiftData) =>
        prisma.shift.create({
          data: shiftData,
        })
      )
    );

    res.status(201).json({ 
      shifts: createdShifts, 
      message: `${createdShifts.length} turnos creados exitosamente` 
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Bulk delete shifts (admin only)
 */
export const bulkDelete = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const { ids } = req.body as { ids: string[] };

    if (!ids || !Array.isArray(ids) || ids.length === 0) {
      res.status(400).json({ error: 'Se requiere una lista de IDs de turnos para eliminar' });
      return;
    }

    // Validate shifts exist
    const existing = await prisma.shift.findMany({ where: { id: { in: ids } }, select: { id: true, startDateTime: true, endDateTime: true, doctorId: true } });
    if (existing.length !== ids.length) {
      const foundIds = new Set(existing.map((s) => s.id));
      const missingIds = ids.filter((id) => !foundIds.has(id));
      res.status(404).json({ error: `Turnos no encontrados: ${missingIds.join(', ')}` });
      return;
    }

    // Prepare audit logs
    const auditLogs = existing.map((s) => ({
      action: 'SHIFT_DELETED',
      userId: req.user!.id,
      details: JSON.stringify({ deletedShiftId: s.id, startDateTime: s.startDateTime, endDateTime: s.endDateTime, doctorId: s.doctorId }),
    }));

    // Delete ShiftDoctor entries and then shifts in a transaction, then create audit logs
    await prisma.$transaction(async (tx) => {
      await tx.shiftDoctor.deleteMany({ where: { shiftId: { in: ids } } });
      await tx.shift.deleteMany({ where: { id: { in: ids } } });
      await tx.auditLog.createMany({ data: auditLogs as any });
    });

    res.json({ message: `${existing.length} turnos eliminados` });
  } catch (error) {
    if ((error as any)?.code === 'P2003') {
      res.status(400).json({ error: 'No se puede eliminar el turno debido a restricciones en la base de datos' });
      return;
    }
    next(error);
  }
};

/**
 * Batch update shift assignments (admin only)
 * Allows assigning multiple doctors to multiple shifts in a single request
 * Now supports multiple doctors per shift using ShiftDoctor junction table
 */
export const batchUpdateAssignments = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const { assignments } = req.body as { 
      assignments: Array<{ shiftId: string; doctorIds: string[] }>
    };

    if (!assignments || !Array.isArray(assignments) || assignments.length === 0) {
      res.status(400).json({ error: 'Se requiere al menos una asignación' });
      return;
    }

    // Validate all shifts exist
    const shiftIds = assignments.map((a) => a.shiftId);
    const existingShifts = await prisma.shift.findMany({
      where: { id: { in: shiftIds } },
      select: { id: true, startDateTime: true, endDateTime: true },
    });

    if (existingShifts.length !== shiftIds.length) {
      const foundIds = new Set(existingShifts.map((s) => s.id));
      const missingIds = shiftIds.filter((id) => !foundIds.has(id));
      res.status(404).json({ 
        error: `Turnos no encontrados: ${missingIds.join(', ')}` 
      });
      return;
    }

    // Collect all doctor IDs and validate they exist
    const allDoctorIds = [...new Set(assignments.flatMap((a) => a.doctorIds || []))];
    
    if (allDoctorIds.length > 0) {
      const existingDoctors = await prisma.user.findMany({
        where: { 
          id: { in: allDoctorIds },
          role: 'DOCTOR',
          isActive: true,
        },
        select: { id: true },
      });

      if (existingDoctors.length !== allDoctorIds.length) {
        const foundDoctorIds = new Set(existingDoctors.map((d) => d.id));
        const missingDoctorIds = allDoctorIds.filter((id) => !foundDoctorIds.has(id));
        res.status(404).json({ 
          error: `Médicos no encontrados o inactivos: ${missingDoctorIds.join(', ')}` 
        });
        return;
      }
    }

    // Perform batch operations in a transaction
    await prisma.$transaction(async (tx) => {
      for (const assignment of assignments) {
        const { shiftId, doctorIds } = assignment;
        
        // Delete existing doctor assignments for this shift
        await tx.shiftDoctor.deleteMany({
          where: { shiftId },
        });
        
        // Create new assignments
        if (doctorIds && doctorIds.length > 0) {
          await tx.shiftDoctor.createMany({
            data: doctorIds.map((doctorId) => ({
              shiftId,
              doctorId,
              assignedBy: req.user!.id,
              isSelfAssigned: false,
            })),
          });
          
          // Update shift status
          await tx.shift.update({
            where: { id: shiftId },
            data: {
              assignmentStatus: 'ADMIN_ASSIGNED',
              isAvailable: false,
              // Also update legacy doctorId field with first doctor for backwards compatibility
              doctorId: doctorIds[0],
            },
          });
        } else {
          // No doctors assigned - mark as available
          await tx.shift.update({
            where: { id: shiftId },
            data: {
              assignmentStatus: 'AVAILABLE',
              isAvailable: true,
              doctorId: null,
            },
          });
        }
      }
    });

    // Fetch updated shifts with doctors
    const updatedShifts = await prisma.shift.findMany({
      where: { id: { in: shiftIds } },
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
          orderBy: { assignedAt: 'asc' },
        },
      },
    });

    // Log all assignments in one audit log entry
    await prisma.auditLog.create({
      data: {
        action: 'SHIFT_ASSIGNED',
        userId: req.user!.id,
        details: JSON.stringify({ 
          batchAssignment: true,
          count: assignments.length,
          assignments: assignments.map((a) => ({
            shiftId: a.shiftId,
            doctorIds: a.doctorIds,
          })),
        }),
      },
    });

    res.json({ 
      shifts: updatedShifts, 
      message: `${updatedShifts.length} turno(s) actualizado(s) exitosamente` 
    });
  } catch (error) {
    next(error);
  }
};
