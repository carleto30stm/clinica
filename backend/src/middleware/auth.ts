import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import prisma from '../config/database';
import { config, ROLES } from '../config/constants';
import { AuthUser, JwtPayload } from '../types';

/**
 * Verify JWT token middleware
 */
export const authenticate = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const authHeader = req.headers.authorization;

    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      res.status(401).json({ error: 'Token de acceso no proporcionado' });
      return;
    }

    const token = authHeader.split(' ')[1];

    const decoded = jwt.verify(token, config.jwt.secret) as JwtPayload;

    const user = await prisma.user.findUnique({
      where: { id: decoded.userId },
      select: {
        id: true,
        email: true,
        name: true,
        role: true,
        specialty: true,
        isActive: true,
      },
    });

    if (!user) {
      res.status(401).json({ error: 'Usuario no encontrado' });
      return;
    }

    if (!user.isActive) {
      res.status(403).json({ error: 'Cuenta desactivada' });
      return;
    }

    req.user = user as AuthUser;
    next();
  } catch (error) {
    if (error instanceof jwt.TokenExpiredError) {
      res.status(401).json({ error: 'Token expirado', code: 'TOKEN_EXPIRED' });
      return;
    }
    if (error instanceof jwt.JsonWebTokenError) {
      res.status(401).json({ error: 'Token inválido' });
      return;
    }
    next(error);
  }
};

/**
 * Require admin role middleware
 */
export const requireAdmin = (
  req: Request,
  res: Response,
  next: NextFunction
): void => {
  if (req.user?.role !== ROLES.ADMIN) {
    res.status(403).json({ error: 'Acceso denegado. Se requieren permisos de administrador.' });
    return;
  }
  next();
};

/**
 * Require doctor role middleware
 */
export const requireDoctor = (
  req: Request,
  res: Response,
  next: NextFunction
): void => {
  if (req.user?.role !== ROLES.DOCTOR) {
    res.status(403).json({ error: 'Acceso denegado. Solo para médicos.' });
    return;
  }
  next();
};

/**
 * Require admin or self (user can access their own data)
 */
export const requireAdminOrSelf = (
  req: Request,
  res: Response,
  next: NextFunction
): void => {
  const targetUserId = req.params.id || req.params.userId;

  if (req.user?.role !== ROLES.ADMIN && req.user?.id !== targetUserId) {
    res.status(403).json({ error: 'Acceso denegado' });
    return;
  }
  next();
};
