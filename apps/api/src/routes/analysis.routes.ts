import { Router } from 'express';
import * as controller from '../controllers/analysis.controller';
import { requireAuth } from '../middleware/auth';
import { validateBody } from '../middleware/validate';
import { asyncHandler } from '../utils/asyncHandler';

const router = Router();

router.use(requireAuth);
router.post('/resume-jd', validateBody(controller.createAnalysisSchema), asyncHandler(controller.create));
router.get('/', asyncHandler(controller.list));
router.get('/:id', asyncHandler(controller.get));

export default router;
