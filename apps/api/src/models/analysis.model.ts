import { HydratedDocument, Schema, Types, model } from 'mongoose';
import type { MatchResult } from '../services/resumeMatch.service';

export interface Analysis {
  userId: Types.ObjectId;
  resumeId: Types.ObjectId;
  jobDescriptionId: Types.ObjectId;
  /** Resume-JD Match Score (0-100). Not a hiring probability. */
  score: number;
  result: MatchResult;
  createdAt: Date;
  updatedAt: Date;
}
export type AnalysisDoc = HydratedDocument<Analysis>;

const analysisSchema = new Schema<Analysis>(
  {
    userId: { type: Schema.Types.ObjectId, ref: 'User', required: true, index: true },
    resumeId: { type: Schema.Types.ObjectId, ref: 'Resume', required: true, index: true },
    jobDescriptionId: { type: Schema.Types.ObjectId, ref: 'JobDescription', required: true, index: true },
    score: { type: Number, required: true, min: 0, max: 100 },
    result: { type: Schema.Types.Mixed, required: true },
  },
  { timestamps: true },
);

export const AnalysisModel = model<Analysis>('Analysis', analysisSchema);
