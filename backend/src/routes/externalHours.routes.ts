import { Router } from 'express';
import { body } from 'express-validator';
import { authenticate, requireAdmin } from '../middleware/auth';
import  validate  from '../middleware/validate';
import * as externalHoursController from '../controllers/externalHours.controller';

const router = Router();

// All routes require authentication
router.use(authenticate);

/**
 * GET /api/external-hours
 * Get all external hours (admin only)
 * Query params: month, year, doctorId
 */
router.get(
  '/',
  requireAdmin,
  externalHoursController.getAll
);

/**
 * GET /api/external-hours/my
 * Get external hours for current doctor
 * Query params: month, year
 */
router.get(
  '/my',
  externalHoursController.getMy
);

/**
 * POST /api/external-hours
 * Create external hours entry (admin only)
 */
router.post(
  '/',
  requireAdmin,
  [
    body('doctorId').isString().notEmpty().withMessage('Doctor ID es requerido'),
    body('hours').isFloat({ min: 0.1 }).withMessage('Horas debe ser un número mayor a 0'),
    body('rate').isFloat({ min: 0 }).withMessage('Tarifa debe ser un número mayor o igual a 0'),
    body('description').optional().isString(),
    body('date').isString().notEmpty().withMessage('Fecha es requerida'),
  ],
  validate,
  externalHoursController.create
);

/**
 * PATCH /api/external-hours/:id
 * Update external hours entry (admin only)
 */
router.patch(
  '/:id',
  requireAdmin,
  [
    body('hours').optional().isFloat({ min: 0.1 }).withMessage('Horas debe ser un número mayor a 0'),
    body('rate').optional().isFloat({ min: 0 }).withMessage('Tarifa debe ser un número mayor o igual a 0'),
    body('description').optional().isString(),
    body('date').optional().isString(),
  ],
  validate,
  externalHoursController.update
);

/**
 * DELETE /api/external-hours/:id
 * Delete external hours entry (admin only)
 */
router.delete(
  '/:id',
  requireAdmin,
  externalHoursController.remove
);

export default router;
