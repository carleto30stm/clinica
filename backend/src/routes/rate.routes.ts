import { Router } from 'express';
import * as rateController from '../controllers/rate.controller';
import { authenticate, requireAdmin } from '../middleware/auth';

const router = Router();

// All routes require authentication
router.use(authenticate);

// GET /api/rates - Get all hourly rates (any authenticated user)
router.get('/', rateController.getAll);

// PUT /api/rates - Update hourly rates (admin only)
router.put('/', requireAdmin, rateController.update);

export default router;
