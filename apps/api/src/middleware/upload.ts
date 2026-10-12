import { RequestHandler } from 'express';
import multer, { MulterError } from 'multer';
import { env } from '../config/env';
import { AppError } from '../utils/AppError';

const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: env.MAX_UPLOAD_MB * 1024 * 1024, files: 1, fields: 0 },
}).single('file');

/** Parses a single multipart "file" field into req.file, mapping multer errors to clean API errors. */
export const uploadSingleFile: RequestHandler = (req, res, next) => {
  upload(req, res, (err: unknown) => {
    if (err instanceof MulterError) {
      if (err.code === 'LIMIT_FILE_SIZE') {
        return next(new AppError(413, `File too large. Maximum size is ${env.MAX_UPLOAD_MB} MB.`));
      }
      return next(new AppError(400, 'Invalid upload. Send exactly one file in the "file" field.'));
    }
    if (err) return next(err);
    if (!req.file) return next(new AppError(400, 'No file uploaded. Send a PDF or DOCX in the "file" field.'));
    next();
  });
};
