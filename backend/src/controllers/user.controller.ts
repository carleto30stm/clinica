import { Request, Response, NextFunction } from 'express';
import bcrypt from 'bcryptjs';
import prisma from '../config/database';
import { CreateUserRequest, UpdateUserRequest } from '../types';

/**
 * Get all users (doctors)
 */
export const getAll = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const { role, isActive, search } = req.query;

    const where: Record<string, unknown> = {};

    if (role) {
      where.role = role;
    }

    if (isActive !== undefined) {
      where.isActive = isActive === 'true';
    }

    if (search) {
      where.OR = [
        { name: { contains: search as string, mode: 'insensitive' } },
        { email: { contains: search as string, mode: 'insensitive' } },
        { specialty: { contains: search as string, mode: 'insensitive' } },
      ];
    }

    const users = await prisma.user.findMany({
      where,
      select: {
        id: true,
        email: true,
        username: true,
        name: true,
        role: true,
        specialty: true,
        phone: true,
        isActive: true,
        hasDiscount: true,
        createdAt: true,
      },
      orderBy: { name: 'asc' },
    });

    res.json({ users });
  } catch (error) {
    next(error);
  }
};

/**
 * Get user by ID
 */
export const getById = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const { id } = req.params;

    const user = await prisma.user.findUnique({
      where: { id },
      select: {
        id: true,
        email: true,
        username: true,
        name: true,
        role: true,
        specialty: true,
        phone: true,
        isActive: true,
        createdAt: true,
        updatedAt: true,
      },
    });

    if (!user) {
      res.status(404).json({ error: 'Usuario no encontrado' });
      return;
    }

    res.json({ user });
  } catch (error) {
    next(error);
  }
};

/**
 * Create new user (admin only)
 */
export const create = async (
  req: Request<object, object, CreateUserRequest>,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const { email, username, password, name, role = 'DOCTOR', specialty, phone } = req.body;

    if (!email && !username) {
      res.status(400).json({ error: 'Se requiere email o username' });
      return;
    }

    const passwordHash = await bcrypt.hash(password, 10);

    const user = await prisma.user.create({
      data: {
        email: email ? email.toLowerCase() : undefined,
        username: username ? username.toLowerCase() : undefined,
        passwordHash,
        name,
        role,
        specialty,
        phone,
      },
      select: {
        id: true,
        email: true,
        username: true,
        name: true,
        role: true,
        specialty: true,
        phone: true,
        isActive: true,
        createdAt: true,
      },
    });

    // Log the action
    await prisma.auditLog.create({
      data: {
        action: 'USER_CREATED',
        userId: req.user!.id,
        details: JSON.stringify({ createdUserId: user.id, email: user.email, username: user.username }),
      },
    });

    res.status(201).json({ user });
  } catch (error) {
    // Handle unique constraint errors gracefully
    // Prisma known request error code for unique constraint is P2002
    if ((error as any)?.code === 'P2002') {
      res.status(400).json({ error: 'Email o username ya en uso' });
      return;
    }

    next(error);
  }
};

/**
 * Update user
 */
export const update = async (
  req: Request<{ id: string }, object, UpdateUserRequest>,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const { id } = req.params;
    const { name, specialty, phone, isActive, hasDiscount } = req.body;

    const user = await prisma.user.update({
      where: { id },
      data: {
        ...(name && { name }),
        ...(specialty !== undefined && { specialty }),
        ...(phone !== undefined && { phone }),
        ...(isActive !== undefined && { isActive }),
        ...(hasDiscount !== undefined && { hasDiscount }),
      },
      select: {
        id: true,
        email: true,
        name: true,
        role: true,
        specialty: true,
        phone: true,
        isActive: true,
        hasDiscount: true,
        updatedAt: true,
      },
    });

    // Log the action
    await prisma.auditLog.create({
      data: {
        action: 'USER_UPDATED',
        userId: req.user!.id,
        details: JSON.stringify({ updatedUserId: id }),
      },
    });

    res.json({ user });
  } catch (error) {
    next(error);
  }
};

/**
 * Delete user (soft delete by deactivating)
 */
export const remove = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const { id } = req.params;

    // Check if user has assigned shifts
    const shiftsCount = await prisma.shift.count({
      where: { doctorId: id },
    });

    if (shiftsCount > 0) {
      // Soft delete - just deactivate
      await prisma.user.update({
        where: { id },
        data: { isActive: false },
      });
    } else {
      // Hard delete if no shifts
      await prisma.user.delete({
        where: { id },
      });
    }

    // Log the action
    await prisma.auditLog.create({
      data: {
        action: 'USER_DELETED',
        userId: req.user!.id,
        details: JSON.stringify({ deletedUserId: id, hadShifts: shiftsCount > 0 }),
      },
    });

    res.json({ message: 'Usuario eliminado exitosamente' });
  } catch (error) {
    next(error);
  }
};

/**
 * Reset user password (admin only)
 */
export const resetPassword = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const { id } = req.params;
    const { newPassword } = req.body;

    const passwordHash = await bcrypt.hash(newPassword, 10);

    await prisma.user.update({
      where: { id },
      data: { passwordHash },
    });

    // Invalidate all refresh tokens for this user
    await prisma.refreshToken.deleteMany({
      where: { userId: id },
    });

    res.json({ message: 'Contraseña restablecida exitosamente' });
  } catch (error) {
    next(error);
  }
};

/**
 * Get all doctors (simplified list for dropdowns)
 */
export const getDoctors = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const doctors = await prisma.user.findMany({
      where: {
        role: 'DOCTOR',
        isActive: true,
      },
      select: {
        id: true,
        name: true,
        specialty: true,
      },
      orderBy: { name: 'asc' },
    });

    res.json({ doctors });
  } catch (error) {
    next(error);
  }
};
