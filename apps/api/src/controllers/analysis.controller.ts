import { Request, Response } from 'express';
import { z } from 'zod';
import * as analysisService from '../services/analysis.service';

export const createAnalysisSchema = z.object({ jobDescriptionId: z.string().min(1, 'jobDescriptionId is required') });

export async function create(req: Request, res: Response) {
  const { jobDescriptionId } = req.body as z.infer<typeof createAnalysisSchema>;
  res.status(201).json({ analysis: await analysisService.createAnalysis(req.user!.id, jobDescriptionId) });
}

export async function get(req: Request, res: Response) {
  res.json({ analysis: await analysisService.getAnalysis(req.user!.id, String(req.params.id)) });
}

export async function list(req: Request, res: Response) {
  res.json({ analyses: await analysisService.listAnalyses(req.user!.id) });
}
