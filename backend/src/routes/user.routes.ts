import { Router } from 'express';
import { body } from 'express-validator';
import * as userController from '../controllers/user.controller';
import { authenticate, requireAdmin } from '../middleware/auth';
import validate from '../middleware/validate';

const router = Router();

// All routes require authentication
router.use(authenticate);

// Get all doctors (simplified list)
router.get('/doctors', userController.getDoctors);

// Get all users (admin only)
router.get('/', requireAdmin, userController.getAll);

// Get user by ID
router.get('/:id', userController.getById);

// Create user (admin only)
router.post(
  '/',
  requireAdmin,
  [
    // email or username optional individually, but at least one required (validated below)
    body('email').optional().isEmail().withMessage('Email inválido'),
    body('username').optional().isAlphanumeric().withMessage('Usuario inválido'),
    body('password')
      .isLength({ min: 6 })
      .withMessage('La contraseña debe tener al menos 6 caracteres'),
    body('name').notEmpty().withMessage('Nombre requerido'),
    body('role').optional().isIn(['ADMIN', 'DOCTOR']).withMessage('Rol inválido'),
    body().custom((_, { req }) => {
      if (!req.body.email && !req.body.username) {
        throw new Error('Se requiere email o username');
      }
      return true;
    }),
  ],
  validate,
  userController.create
);

// Update user (admin only)
router.put(
  '/:id',
  requireAdmin,
  [
    body('name').optional().notEmpty().withMessage('Nombre no puede estar vacío'),
    body('isActive').optional().isBoolean().withMessage('isActive debe ser booleano'),
  ],
  validate,
  userController.update
);

// Delete user (admin only)
router.delete('/:id', requireAdmin, userController.remove);

// Reset password (admin only)
router.post(
  '/:id/reset-password',
  requireAdmin,
  [
    body('newPassword')
      .isLength({ min: 6 })
      .withMessage('La contraseña debe tener al menos 6 caracteres'),
  ],
  validate,
  userController.resetPassword
);

export default router;
