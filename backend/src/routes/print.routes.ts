import { Router } from 'express';
import * as pdfController from '../controllers/pdf.controller';
import { authenticate, requireAdmin } from '../middleware/auth';

const router = Router();

router.use(authenticate);
router.get('/schedule', requireAdmin, pdfController.generateSchedulePdf);
router.get('/payroll', requireAdmin, pdfController.generatePayrollPdf);

export default router;
