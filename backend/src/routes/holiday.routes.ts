import { Router } from 'express';
import { body } from 'express-validator';
import * as holidayController from '../controllers/holiday.controller';
import { authenticate, requireAdmin } from '../middleware/auth';
import validate from '../middleware/validate';

const router = Router();

// All routes require authentication
router.use(authenticate);

// Get all holidays (accessible to all authenticated users)
router.get('/', holidayController.getAll);

// Get holiday by ID (accessible to all authenticated users)
router.get('/:id', holidayController.getById);

// Admin-only routes below

// Create new holiday
router.post(
  '/',
  requireAdmin,
  [
    body('date').isISO8601().withMessage('Fecha inválida'),
    body('name').trim().notEmpty().withMessage('El nombre es requerido'),
    body('isRecurrent').optional().isBoolean().withMessage('isRecurrent debe ser boolean'),
  ],
  validate,
  holidayController.create
);

// Update holiday
router.put(
  '/:id',
  requireAdmin,
  [
    body('date').optional().isISO8601().withMessage('Fecha inválida'),
    body('name').optional().trim().notEmpty().withMessage('El nombre no puede estar vacío'),
    body('isRecurrent').optional().isBoolean().withMessage('isRecurrent debe ser boolean'),
  ],
  validate,
  holidayController.update
);

// Delete holiday
router.delete('/:id', requireAdmin, holidayController.remove);

// Bulk create holidays
router.post(
  '/bulk',
  requireAdmin,
  [
    body('holidays').isArray({ min: 1 }).withMessage('Debe incluir al menos un feriado'),
    body('holidays.*.date').isISO8601().withMessage('Fecha inválida'),
    body('holidays.*.name').trim().notEmpty().withMessage('El nombre es requerido'),
    body('holidays.*.isRecurrent').optional().isBoolean(),
  ],
  validate,
  holidayController.bulkCreate
);

export default router;
