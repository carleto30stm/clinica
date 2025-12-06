import { Request, Response, NextFunction } from 'express';
import { Prisma } from '@prisma/client';

interface CustomError extends Error {
  status?: number;
  code?: string;
  meta?: {
    target?: string[];
  };
  errors?: unknown[];
}

/**
 * Global error handler middleware
 */
const errorHandler = (
  err: CustomError,
  req: Request,
  res: Response,
  _next: NextFunction
): void => {
  console.error('Error:', err);

  // Prisma errors
  if (err instanceof Prisma.PrismaClientKnownRequestError) {
    if (err.code === 'P2002') {
      res.status(400).json({
        error: 'Ya existe un registro con estos datos',
        field: err.meta?.target,
      });
      return;
    }

    if (err.code === 'P2025') {
      res.status(404).json({
        error: 'Registro no encontrado',
      });
      return;
    }

    // Foreign key constraint (FK) violation
    if (err.code === 'P2003') {
      res.status(400).json({
        error: 'Restricción de integridad referencial: existe una relación con este registro',
      });
      return;
    }
  }

  // Validation errors
  if (err.name === 'ValidationError') {
    res.status(400).json({
      error: 'Error de validación',
      details: err.errors,
    });
    return;
  }

  // JWT errors
  if (err.name === 'JsonWebTokenError') {
    res.status(401).json({
      error: 'Token inválido',
    });
    return;
  }

  if (err.name === 'TokenExpiredError') {
    res.status(401).json({
      error: 'Token expirado',
      code: 'TOKEN_EXPIRED',
    });
    return;
  }

  // Default error
  res.status(err.status || 500).json({
    error: err.message || 'Error interno del servidor',
    ...(process.env.NODE_ENV === 'development' && { stack: err.stack }),
  });
};

export default errorHandler;
