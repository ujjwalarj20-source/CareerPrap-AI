import { isValidObjectId } from 'mongoose';
import type { StructuredResume } from '../ai/schemas/resume.schema';
import { AnalysisDoc, AnalysisModel } from '../models/analysis.model';
import { JobDescriptionModel } from '../models/jobDescription.model';
import { ResumeModel } from '../models/resume.model';
import { AppError } from '../utils/AppError';
import { MatchResult, computeMatch } from './resumeMatch.service';

export interface PublicAnalysis {
  id: string;
  resumeId: string;
  jobDescriptionId: string;
  resumeFileName: string | null;
  jobTitle: string | null;
  company: string | null;
  score: number;
  result: MatchResult;
  createdAt: Date;
}

async function toPublic(a: AnalysisDoc): Promise<PublicAnalysis> {
  const [resume, jd] = await Promise.all([
    ResumeModel.findById(a.resumeId).select('originalFileName'),
    JobDescriptionModel.findById(a.jobDescriptionId).select('structuredJdData'),
  ]);
  return {
    id: a.id,
    resumeId: String(a.resumeId),
    jobDescriptionId: String(a.jobDescriptionId),
    resumeFileName: resume?.originalFileName ?? null,
    jobTitle: jd?.structuredJdData?.jobTitle ?? null,
    company: jd?.structuredJdData?.company ?? null,
    score: a.score,
    result: a.result,
    createdAt: a.createdAt,
  };
}

/** Compares the already-saved structured resume with the already-saved structured JD. */
export async function createAnalysis(userId: string, jobDescriptionId: string): Promise<PublicAnalysis> {
  const jd = isValidObjectId(jobDescriptionId)
    ? await JobDescriptionModel.findOne({ _id: jobDescriptionId, userId })
    : null;
  if (!jd) throw new AppError(404, 'Job description not found');
  if (jd.parsingStatus !== 'COMPLETED' || !jd.structuredJdData) {
    throw new AppError(409, 'This job description was not analyzed successfully. Please add it again.');
  }
  const resume = await ResumeModel.findOne({ _id: jd.resumeId, userId }).select('+extractedText');
  if (!resume) throw new AppError(409, 'The resume for this job description no longer exists.');
  if (resume.parsingStatus !== 'COMPLETED' || !resume.structuredResumeData) {
    throw new AppError(409, 'Your resume has not finished analyzing.');
  }

  const result = computeMatch(resume.structuredResumeData as StructuredResume, resume.extractedText, jd.structuredJdData);
  const analysis = await AnalysisModel.create({
    userId,
    resumeId: resume._id,
    jobDescriptionId: jd._id,
    score: result.score,
    result,
  });
  return toPublic(analysis);
}

export async function getAnalysis(userId: string, id: string): Promise<PublicAnalysis> {
  const analysis = isValidObjectId(id) ? await AnalysisModel.findOne({ _id: id, userId }) : null;
  if (!analysis) throw new AppError(404, 'Analysis not found');
  return toPublic(analysis);
}

/** The user's most recent analyses, newest first. */
export async function listAnalyses(userId: string, limit = 10): Promise<PublicAnalysis[]> {
  const analyses = await AnalysisModel.find({ userId }).sort({ createdAt: -1 }).limit(limit);
  return Promise.all(analyses.map(toPublic));
}
