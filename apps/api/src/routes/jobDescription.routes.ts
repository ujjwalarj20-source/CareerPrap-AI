import { Router } from 'express';
import rateLimit from 'express-rate-limit';
import { env } from '../config/env';
import * as controller from '../controllers/jobDescription.controller';
import { requireAuth } from '../middleware/auth';
import { validateBody } from '../middleware/validate';
import { asyncHandler } from '../utils/asyncHandler';

const router = Router();

// Each submission triggers a paid LLM call.
const limiter = rateLimit({
  windowMs: 60 * 60 * 1000,
  limit: 60,
  standardHeaders: true,
  legacyHeaders: false,
  skip: () => env.NODE_ENV === 'test',
});

router.use(requireAuth);
router.post('/', limiter, validateBody(controller.createJdSchema), asyncHandler(controller.create));
router.get('/:id', asyncHandler(controller.get));

export default router;
