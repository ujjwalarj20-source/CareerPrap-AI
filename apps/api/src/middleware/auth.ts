import { RequestHandler } from 'express';
import { UserDoc } from '../models/user.model';
import { getUserById } from '../services/auth.service';
import { AppError } from '../utils/AppError';
import { AUTH_COOKIE, verifyToken } from '../utils/jwt';

declare global {
  // eslint-disable-next-line @typescript-eslint/no-namespace
  namespace Express {
    interface Request {
      user?: UserDoc;
    }
  }
}

export const requireAuth: RequestHandler = async (req, _res, next) => {
  try {
    const token = req.cookies?.[AUTH_COOKIE];
    const userId = token ? verifyToken(token) : null;
    if (!userId) throw new AppError(401, 'Authentication required');
    const user = await getUserById(userId);
    if (!user) throw new AppError(401, 'Authentication required');
    req.user = user;
    next();
  } catch (err) {
    next(err);
  }
};
