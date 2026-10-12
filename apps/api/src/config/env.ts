import 'dotenv/config';
import { z } from 'zod';

const optionalString = z
  .string()
  .optional()
  .transform((v) => v?.trim() || undefined);

const schema = z
  .object({
  NODE_ENV: z.enum(['development', 'test', 'production']).default('development'),
  PORT: z.coerce.number().int().positive().default(4000),
  MONGODB_URI: z.string().min(1),
  JWT_SECRET: z.string().min(32, 'JWT_SECRET must be at least 32 characters'),
  JWT_EXPIRES_IN_DAYS: z.coerce.number().int().positive().default(7),
  COOKIE_SECURE: z
    .enum(['true', 'false'])
    .default('false')
    .transform((v) => v === 'true'),
  CLIENT_ORIGIN: z.string().url().default('http://localhost:3000'),

  // File storage: "local" (private folder, dev) or "s3" (any S3-compatible service)
  STORAGE_DRIVER: z.enum(['local', 's3']).default('local'),
  LOCAL_STORAGE_DIR: z.string().default('./storage'),
  S3_ENDPOINT: optionalString,
  S3_REGION: z.string().default('auto'),
  S3_BUCKET: optionalString,
  S3_ACCESS_KEY_ID: optionalString,
  S3_SECRET_ACCESS_KEY: optionalString,
  S3_FORCE_PATH_STYLE: z
    .enum(['true', 'false'])
    .default('false')
    .transform((v) => v === 'true'),

  MAX_UPLOAD_MB: z.coerce.number().positive().max(25).default(5),

  // How resumes and job descriptions are parsed. "local" (default) is rule-based and needs no external service;
  // "anthropic" is an optional AI mode that requires ANTHROPIC_API_KEY.
  AI_PROVIDER: z.enum(['local', 'anthropic']).default('local'),
  ANTHROPIC_API_KEY: optionalString,
  AI_MODEL: z.string().default('claude-sonnet-5-5'),
  })
  .superRefine((cfg, ctx) => {
    if (cfg.AI_PROVIDER === 'anthropic' && !cfg.ANTHROPIC_API_KEY) {
      ctx.addIssue({ code: 'custom', path: ['ANTHROPIC_API_KEY'], message: 'ANTHROPIC_API_KEY is required when AI_PROVIDER=anthropic' });
    }
    if (cfg.STORAGE_DRIVER !== 's3') return;
    for (const key of ['S3_BUCKET', 'S3_ACCESS_KEY_ID', 'S3_SECRET_ACCESS_KEY'] as const) {
      if (!cfg[key]) ctx.addIssue({ code: 'custom', path: [key], message: `${key} is required when STORAGE_DRIVER=s3` });
    }
  });

const parsed = schema.safeParse(process.env);
if (!parsed.success) {
  console.error('Invalid environment variables:', parsed.error.flatten().fieldErrors);
  process.exit(1);
}

export const env = parsed.data;
