import { Router } from 'express';
import { body } from 'express-validator';
import * as authController from '../controllers/auth.controller';
import { authenticate } from '../middleware/auth';
import validate from '../middleware/validate';

const router = Router();

// Login
router.post(
  '/login',
  [
    body('email')
      .notEmpty()
      .withMessage('Email o usuario requerido')
      .bail()
      .custom((val) => {
        // If user included an @, validate as email
        if (typeof val === 'string' && val.includes('@')) {
          // use a basic regex for email validation or rely on isEmail
          const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
          if (!emailRegex.test(val)) throw new Error('Email inválido');
        }
        return true;
      }),
    body('password').notEmpty().withMessage('Contraseña requerida'),
  ],
  validate,
  authController.login
);

// Refresh token
router.post(
  '/refresh',
  [body('refreshToken').notEmpty().withMessage('Refresh token requerido')],
  validate,
  authController.refreshToken
);

// Logout
router.post('/logout', authenticate, authController.logout);

// Get current user
router.get('/me', authenticate, authController.me);

// Change password
router.post(
  '/change-password',
  authenticate,
  [
    body('currentPassword').notEmpty().withMessage('Contraseña actual requerida'),
    body('newPassword')
      .isLength({ min: 6 })
      .withMessage('La nueva contraseña debe tener al menos 6 caracteres'),
  ],
  validate,
  authController.changePassword
);

export default router;
