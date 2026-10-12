import { Request, Response } from 'express';
import { z } from 'zod';
import * as jdService from '../services/jobDescription.service';

export const MIN_JD_CHARS = 50;
export const MAX_JD_CHARS = 20000;

export const createJdSchema = z.object({
  resumeId: z.string().min(1, 'Choose a resume first'),
  text: z
    .string()
    .transform((t) => t.trim())
    .pipe(
      z
        .string()
        .min(1, 'Please paste a job description')
        .min(MIN_JD_CHARS, `The job description is too short. Please paste at least ${MIN_JD_CHARS} characters.`)
        .max(MAX_JD_CHARS, `The job description is too long (maximum ${MAX_JD_CHARS} characters).`),
    ),
});

export async function create(req: Request, res: Response) {
  const { resumeId, text } = req.body as z.infer<typeof createJdSchema>;
  const jd = await jdService.createJobDescription(req.user!.id, resumeId, text);
  res.status(201).json({ jobDescription: jdService.toPublicJd(jd) });
}

export async function get(req: Request, res: Response) {
  const jd = await jdService.getJobDescription(req.user!.id, String(req.params.id));
  res.json({ jobDescription: jdService.toPublicJd(jd) });
}
