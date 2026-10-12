import { Router } from 'express';
import rateLimit from 'express-rate-limit';
import { env } from '../config/env';
import * as controller from '../controllers/auth.controller';
import { requireAuth } from '../middleware/auth';
import { validateBody } from '../middleware/validate';
import { asyncHandler } from '../utils/asyncHandler';

const router = Router();

const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  limit: 50,
  standardHeaders: true,
  legacyHeaders: false,
  skip: () => env.NODE_ENV === 'test',
});

router.post('/register', authLimiter, validateBody(controller.registerSchema), asyncHandler(controller.register));
router.post('/login', authLimiter, validateBody(controller.loginSchema), asyncHandler(controller.login));
router.post('/logout', controller.logout);
router.get('/me', requireAuth, controller.me);

export default router;
