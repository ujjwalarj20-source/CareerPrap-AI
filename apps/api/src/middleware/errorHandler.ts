import { ErrorRequestHandler, RequestHandler } from 'express';
import { env } from '../config/env';
import { AppError } from '../utils/AppError';

export const notFound: RequestHandler = (_req, _res, next) => next(new AppError(404, 'Route not found'));

export const errorHandler: ErrorRequestHandler = (err, _req, res, _next) => {
  if (err instanceof AppError) {
    res.status(err.statusCode).json({ error: { message: err.message, details: err.details } });
    return;
  }
  if (err?.type === 'entity.parse.failed') {
    res.status(400).json({ error: { message: 'Malformed JSON body' } });
    return;
  }
  if (env.NODE_ENV !== 'test') console.error(err);
  res.status(500).json({ error: { message: 'Internal server error' } });
};
