import { Request, Response } from 'express';
import * as resumeService from '../services/resume.service';

export async function upload(req: Request, res: Response) {
  const resume = await resumeService.uploadResume(req.user!.id, req.file!);
  res.status(201).json({ resume: resumeService.toPublicResume(resume, false) });
}

export async function list(req: Request, res: Response) {
  res.json({ resumes: await resumeService.listResumes(req.user!.id) });
}

export async function get(req: Request, res: Response) {
  res.json({ resume: await resumeService.getResume(req.user!.id, String(req.params.id)) });
}

export async function remove(req: Request, res: Response) {
  await resumeService.deleteResume(req.user!.id, String(req.params.id));
  res.status(204).end();
}
