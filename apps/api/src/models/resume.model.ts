import { HydratedDocument, Schema, Types, model } from 'mongoose';
import type { StructuredResume } from '../ai/schemas/resume.schema';

export const PARSING_STATUSES = ['UPLOADED', 'PARSING', 'COMPLETED', 'FAILED'] as const;
export type ParsingStatus = (typeof PARSING_STATUSES)[number];
export type ResumeFileType = 'pdf' | 'docx';

export interface Resume {
  userId: Types.ObjectId;
  originalFileName: string;
  fileType: ResumeFileType;
  fileSize: number;
  storageKey: string;
  extractedText?: string;
  structuredResumeData?: StructuredResume;
  parsingStatus: ParsingStatus;
  parsingError?: string;
  createdAt: Date;
  updatedAt: Date;
}
export type ResumeDoc = HydratedDocument<Resume>;

const resumeSchema = new Schema<Resume>(
  {
    userId: { type: Schema.Types.ObjectId, ref: 'User', required: true, index: true },
    originalFileName: { type: String, required: true, maxlength: 255 },
    fileType: { type: String, enum: ['pdf', 'docx'], required: true },
    fileSize: { type: Number, required: true },
    storageKey: { type: String, required: true, select: false },
    extractedText: { type: String, select: false },
    structuredResumeData: { type: Schema.Types.Mixed },
    parsingStatus: { type: String, enum: PARSING_STATUSES, default: 'UPLOADED', required: true },
    parsingError: { type: String },
  },
  { timestamps: true },
);

resumeSchema.index({ userId: 1, createdAt: -1 });

export const ResumeModel = model<Resume>('Resume', resumeSchema);
