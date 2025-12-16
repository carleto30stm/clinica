import { Router } from 'express';
import * as discountController from '../controllers/discount.controller';
import { authenticate, requireAdmin } from '../middleware/auth';
import { body } from 'express-validator';
import validate from '../middleware/validate';

const router = Router();

router.use(authenticate);
router.use(requireAdmin);

router.get('/', discountController.getAll);
router.get('/active', discountController.getActive);

router.post(
  '/',
  [
    body('amount').isNumeric().withMessage('El monto debe ser numérico'),
  ],
  validate,
  discountController.create
);

router.patch(
  '/:id',
  [
    body('amount').optional().isNumeric().withMessage('El monto debe ser numérico'),
    body('isActive').optional().isBoolean().withMessage('isActive debe ser booleano'),
  ],
  validate,
  discountController.update
);

router.delete('/:id', discountController.remove);

export default router;
