import { Router } from 'express';
import * as statsController from '../controllers/stats.controller';
import { authenticate, requireAdmin } from '../middleware/auth';

const router = Router();

// All routes require authentication
router.use(authenticate);

// Get monthly statistics (admin only)
router.get('/monthly', requireAdmin, statsController.getMonthlyStats);

// Get daily coverage (admin only)
router.get('/coverage', requireAdmin, statsController.getDailyCoverage);

// Get weekend coverage (admin only)
router.get('/weekends', requireAdmin, statsController.getWeekendCoverage);

// Get doctor hours detail
router.get('/doctor/:doctorId/hours', statsController.getDoctorHours);

export default router;
