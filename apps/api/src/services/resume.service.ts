import { randomUUID } from 'crypto';
import path from 'path';
import { isValidObjectId } from 'mongoose';
import { extractResume } from '../ai/resumeExtractor';
import { AnalysisModel } from '../models/analysis.model';
import { JobDescriptionModel } from '../models/jobDescription.model';
import { Resume, ResumeDoc, ResumeModel } from '../models/resume.model';
import { getStorage } from '../storage';
import { AppError } from '../utils/AppError';
import { detectResumeFileType, extractText } from './textExtraction.service';

const MIME: Record<'pdf' | 'docx', string> = {
  pdf: 'application/pdf',
  docx: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
};
const MIN_TEXT_LENGTH = 50;

export interface PublicResume {
  id: string;
  originalFileName: string;
  fileType: Resume['fileType'];
  fileSize: number;
  parsingStatus: Resume['parsingStatus'];
  parsingError: string | null;
  structuredResumeData: Resume['structuredResumeData'] | null;
  createdAt: Date;
  updatedAt: Date;
}

/** Public shape: never includes the storage key or the raw extracted text. */
export function toPublicResume(r: ResumeDoc, includeData = true): PublicResume {
  return {
    id: r.id,
    originalFileName: r.originalFileName,
    fileType: r.fileType,
    fileSize: r.fileSize,
    parsingStatus: r.parsingStatus,
    parsingError: r.parsingError ?? null,
    structuredResumeData: includeData ? (r.structuredResumeData ?? null) : null,
    createdAt: r.createdAt,
    updatedAt: r.updatedAt,
  };
}

function safeDisplayName(name: string): string {
  // eslint-disable-next-line no-control-regex
  return path.basename(name).replace(/[\x00-\x1f\x7f]/g, '').slice(0, 255) || 'resume';
}

export async function uploadResume(
  userId: string,
  file: { originalname: string; buffer: Buffer; size: number },
): Promise<ResumeDoc> {
  const fileType = detectResumeFileType(file.originalname, file.buffer);
  // Key is generated server-side; the user-supplied filename never touches the storage path.
  const storageKey = `resumes/${userId}/${randomUUID()}.${fileType}`;
  await getStorage().put(storageKey, file.buffer, MIME[fileType]);

  let resume: ResumeDoc;
  try {
    resume = await ResumeModel.create({
      userId,
      originalFileName: safeDisplayName(file.originalname),
      fileType,
      fileSize: file.size,
      storageKey,
      parsingStatus: 'UPLOADED',
    });
  } catch (err) {
    await getStorage().delete(storageKey).catch(() => undefined);
    throw err;
  }

  // Parsing runs in the background; clients poll GET /api/resumes/:id. (Moves to BullMQ in a later phase.)
  void processResume(resume.id).catch((err) => console.error('Resume processing crashed', err));
  return resume;
}

export async function processResume(resumeId: string): Promise<void> {
  const resume = await ResumeModel.findByIdAndUpdate(
    resumeId,
    { parsingStatus: 'PARSING', $unset: { parsingError: 1 } },
    { new: true },
  ).select('+storageKey');
  if (!resume) return; // deleted meanwhile

  try {
    const buffer = await getStorage().get(resume.storageKey);
    const text = await extractText(buffer, resume.fileType);
    if (text.length < MIN_TEXT_LENGTH) {
      throw new AppError(422, 'No readable text found. Scanned or image-only resumes are not supported yet.');
    }
    await ResumeModel.updateOne({ _id: resumeId }, { extractedText: text });

    const structured = await extractResume(text);
    await ResumeModel.updateOne(
      { _id: resumeId },
      { structuredResumeData: structured, parsingStatus: 'COMPLETED' },
    );
  } catch (err) {
    const message = err instanceof AppError ? err.message : 'We could not analyze this resume. Please try again.';
    if (!(err instanceof AppError)) console.error('Resume parsing failed', err);
    await ResumeModel.updateOne({ _id: resumeId }, { parsingStatus: 'FAILED', parsingError: message });
  }
}

export async function listResumes(userId: string): Promise<PublicResume[]> {
  const resumes = await ResumeModel.find({ userId }).sort({ createdAt: -1 });
  return resumes.map((r) => toPublicResume(r, false));
}

async function findOwned(userId: string, id: string): Promise<ResumeDoc> {
  const resume = isValidObjectId(id) ? await ResumeModel.findOne({ _id: id, userId }).select('+storageKey') : null;
  // Same 404 whether it doesn't exist or belongs to someone else.
  if (!resume) throw new AppError(404, 'Resume not found');
  return resume;
}

export async function getResume(userId: string, id: string): Promise<PublicResume> {
  return toPublicResume(await findOwned(userId, id));
}

export async function deleteResume(userId: string, id: string): Promise<void> {
  const resume = await findOwned(userId, id);
  // Remove everything derived from this resume too.
  await Promise.all([
    AnalysisModel.deleteMany({ resumeId: resume._id }),
    JobDescriptionModel.deleteMany({ resumeId: resume._id }),
  ]);
  await ResumeModel.deleteOne({ _id: resume._id });
  await getStorage().delete(resume.storageKey).catch((err) => console.error('Storage delete failed', err));
}
