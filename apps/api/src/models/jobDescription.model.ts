import { HydratedDocument, Schema, Types, model } from 'mongoose';
import type { StructuredJd } from '../ai/schemas/jd.schema';
import { PARSING_STATUSES, ParsingStatus } from './resume.model';

export interface JobDescription {
  userId: Types.ObjectId;
  resumeId: Types.ObjectId;
  originalText: string;
  structuredJdData?: StructuredJd;
  parsingStatus: ParsingStatus;
  parsingError?: string;
  createdAt: Date;
  updatedAt: Date;
}
export type JobDescriptionDoc = HydratedDocument<JobDescription>;

const jobDescriptionSchema = new Schema<JobDescription>(
  {
    userId: { type: Schema.Types.ObjectId, ref: 'User', required: true, index: true },
    resumeId: { type: Schema.Types.ObjectId, ref: 'Resume', required: true, index: true },
    originalText: { type: String, required: true },
    structuredJdData: { type: Schema.Types.Mixed },
    parsingStatus: { type: String, enum: PARSING_STATUSES, default: 'PARSING', required: true },
    parsingError: { type: String },
  },
  { timestamps: true },
);

export const JobDescriptionModel = model<JobDescription>('JobDescription', jobDescriptionSchema);
