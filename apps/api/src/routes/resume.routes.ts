import { Router } from 'express';
import rateLimit from 'express-rate-limit';
import { env } from '../config/env';
import * as controller from '../controllers/resume.controller';
import { requireAuth } from '../middleware/auth';
import { uploadSingleFile } from '../middleware/upload';
import { asyncHandler } from '../utils/asyncHandler';

const router = Router();

// Each upload triggers a paid LLM call, so cap them per client.
const uploadLimiter = rateLimit({
  windowMs: 60 * 60 * 1000,
  limit: 30,
  standardHeaders: true,
  legacyHeaders: false,
  skip: () => env.NODE_ENV === 'test',
});

router.use(requireAuth);
router.post('/upload', uploadLimiter, uploadSingleFile, asyncHandler(controller.upload));
router.get('/', asyncHandler(controller.list));
router.get('/:id', asyncHandler(controller.get));
router.delete('/:id', asyncHandler(controller.remove));

export default router;
