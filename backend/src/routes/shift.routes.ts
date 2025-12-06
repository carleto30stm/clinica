import { Router } from 'express';
import { body, query } from 'express-validator';
import * as shiftController from '../controllers/shift.controller';
import { authenticate, requireAdmin } from '../middleware/auth';
import validate from '../middleware/validate';

const router = Router();

// All routes require authentication
router.use(authenticate);

// Get my shifts (for doctors)
router.get('/my', shiftController.getMyShifts);

// Get available shifts (for doctors to self-assign)
router.get('/available', shiftController.getAvailable);

// Get all shifts
router.get('/', shiftController.getAll);

// Get shift by ID
router.get('/:id', shiftController.getById);

// Create shift (admin only)
router.post(
  '/',
  requireAdmin,
  [
    body('startDateTime').isISO8601().withMessage('Fecha de inicio inválida'),
    body('endDateTime').isISO8601().withMessage('Fecha de fin inválida'),
    body('type').isIn(['FIXED', 'ROTATING']).withMessage('Tipo de turno inválido'),
    body('isAvailable').optional().isBoolean(),
    body('doctorId').optional().isUUID(),
    body('doctorIds').optional().isArray().withMessage('doctorIds debe ser un array'),
    body('doctorIds.*').optional().isUUID().withMessage('ID de médico inválido'),
  ],
  validate,
  shiftController.create
);

// Bulk create shifts (admin only)
router.post(
  '/bulk',
  requireAdmin,
  [
    body('shifts').isArray({ min: 1 }).withMessage('Se requiere al menos un turno'),
    body('shifts.*.startDateTime').isISO8601().withMessage('Fecha de inicio inválida'),
    body('shifts.*.endDateTime').isISO8601().withMessage('Fecha de fin inválida'),
    body('shifts.*.type').isIn(['FIXED', 'ROTATING']).withMessage('Tipo de turno inválido'),
  ],
  validate,
  shiftController.bulkCreate
);

// Batch update shift assignments (admin only) - supports multiple doctors per shift
router.patch(
  '/batch-assign',
  requireAdmin,
  [
    body('assignments').isArray({ min: 1 }).withMessage('Se requiere al menos una asignación'),
    body('assignments.*.shiftId').isUUID().withMessage('ID de turno inválido'),
    body('assignments.*.doctorIds').isArray().withMessage('doctorIds debe ser un array'),
    body('assignments.*.doctorIds.*').optional().isUUID().withMessage('ID de médico inválido'),
  ],
  validate,
  shiftController.batchUpdateAssignments
);

// Update shift (admin only)
router.put(
  '/:id',
  requireAdmin,
  [
    body('startDateTime').optional().isISO8601().withMessage('Fecha de inicio inválida'),
    body('endDateTime').optional().isISO8601().withMessage('Fecha de fin inválida'),
    body('type').optional().isIn(['FIXED', 'ROTATING']).withMessage('Tipo de turno inválido'),
    body('isAvailable').optional().isBoolean(),
    body('doctorId').optional(),
  ],
  validate,
  shiftController.update
);

// Delete shift (admin only)
router.delete('/:id', requireAdmin, shiftController.remove);

// Self-assign shift (doctors)
router.post('/:id/self-assign', shiftController.selfAssign);

export default router;
