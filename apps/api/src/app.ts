import cookieParser from 'cookie-parser';
import cors from 'cors';
import express from 'express';
import helmet from 'helmet';
import mongoose from 'mongoose';
import { env } from './config/env';
import { errorHandler, notFound } from './middleware/errorHandler';
import analysisRoutes from './routes/analysis.routes';
import authRoutes from './routes/auth.routes';
import jobDescriptionRoutes from './routes/jobDescription.routes';
import resumeRoutes from './routes/resume.routes';

export function createApp() {
  const app = express();
  app.use(helmet());
  app.use(cors({ origin: env.CLIENT_ORIGIN, credentials: true }));
  app.use(express.json({ limit: '1mb' }));
  app.use(cookieParser());

  app.get('/api/health', (_req, res) => {
    res.json({ status: 'ok', db: mongoose.connection.readyState === 1 ? 'up' : 'down' });
  });
  app.use('/api/auth', authRoutes);
  app.use('/api/resumes', resumeRoutes);
  app.use('/api/job-descriptions', jobDescriptionRoutes);
  app.use('/api/analyses', analysisRoutes);

  app.use(notFound);
  app.use(errorHandler);
  return app;
}
