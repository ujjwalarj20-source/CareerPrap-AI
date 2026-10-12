import { isValidObjectId } from 'mongoose';
import { extractJd } from '../ai/jdExtractor';
import { JobDescription, JobDescriptionDoc, JobDescriptionModel } from '../models/jobDescription.model';
import { ResumeModel } from '../models/resume.model';
import { AppError } from '../utils/AppError';

export interface PublicJobDescription {
  id: string;
  resumeId: string;
  originalText: string;
  structuredJdData: JobDescription['structuredJdData'] | null;
  parsingStatus: JobDescription['parsingStatus'];
  parsingError: string | null;
  createdAt: Date;
  updatedAt: Date;
}

export function toPublicJd(jd: JobDescriptionDoc): PublicJobDescription {
  return {
    id: jd.id,
    resumeId: String(jd.resumeId),
    originalText: jd.originalText,
    structuredJdData: jd.structuredJdData ?? null,
    parsingStatus: jd.parsingStatus,
    parsingError: jd.parsingError ?? null,
    createdAt: jd.createdAt,
    updatedAt: jd.updatedAt,
  };
}

/** Saves the JD, then parses it. The JD is kept (as FAILED) even when AI parsing fails. */
export async function createJobDescription(userId: string, resumeId: string, text: string): Promise<JobDescriptionDoc> {
  const resume = isValidObjectId(resumeId) ? await ResumeModel.findOne({ _id: resumeId, userId }) : null;
  if (!resume) throw new AppError(404, 'Resume not found');
  if (resume.parsingStatus !== 'COMPLETED') {
    throw new AppError(409, 'Your resume must finish analyzing before you can add a job description.');
  }

  const jd = await JobDescriptionModel.create({ userId, resumeId: resume._id, originalText: text, parsingStatus: 'PARSING' });
  try {
    jd.structuredJdData = await extractJd(text);
    jd.parsingStatus = 'COMPLETED';
  } catch (err) {
    if (!(err instanceof AppError)) console.error('JD parsing failed', err);
    jd.parsingStatus = 'FAILED';
    jd.parsingError =
      err instanceof AppError ? err.message : 'We could not analyze this job description. Please try again.';
  }
  await jd.save();
  return jd;
}

export async function getJobDescription(userId: string, id: string): Promise<JobDescriptionDoc> {
  const jd = isValidObjectId(id) ? await JobDescriptionModel.findOne({ _id: id, userId }) : null;
  if (!jd) throw new AppError(404, 'Job description not found');
  return jd;
}
