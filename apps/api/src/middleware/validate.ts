import { RequestHandler } from 'express';
import { ZodSchema } from 'zod';
import { AppError } from '../utils/AppError';

export const validateBody =
  (schema: ZodSchema): RequestHandler =>
  (req, _res, next) => {
    const result = schema.safeParse(req.body);
    if (!result.success) {
      return next(new AppError(400, 'Validation failed', result.error.flatten().fieldErrors));
    }
    req.body = result.data;
    next();
  };
