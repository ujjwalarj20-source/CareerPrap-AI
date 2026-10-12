import { env } from '../config/env';
import { parseResumeLocally } from '../parsing/localResumeParser';
import { AppError } from '../utils/AppError';
import { completeText, parseJsonObject } from './llm.client';
import {
  RESUME_EXTRACTION_SYSTEM_PROMPT,
  buildResumeExtractionUserPrompt,
} from './prompts/resumeExtraction.prompt';
import { StructuredResume, structuredResumeSchema } from './schemas/resume.schema';

const MAX_INPUT_CHARS = 40_000;

const digits = (s: string) => s.replace(/\D/g, '');
const squash = (s: string) => s.toLowerCase().replace(/\s+/g, ' ');

/**
 * Anti-hallucination pass: contact details and skills must literally appear in the resume text,
 * otherwise they are dropped.
 */
export function groundInSourceText(data: StructuredResume, sourceText: string): StructuredResume {
  const haystack = squash(sourceText);
  const sourceDigits = digits(sourceText);
  return {
    ...data,
    email: data.email && haystack.includes(data.email.toLowerCase()) ? data.email : null,
    phone:
      data.phone && digits(data.phone).length >= 7 && sourceDigits.includes(digits(data.phone))
        ? data.phone
        : null,
    skills: data.skills.filter((skill) => haystack.includes(squash(skill))),
  };
}

export async function extractResume(resumeText: string): Promise<StructuredResume> {
  const text = resumeText.slice(0, MAX_INPUT_CHARS);
  if (env.AI_PROVIDER === 'local') return groundInSourceText(parseResumeLocally(text), text);
  const raw = await completeText({
    system: RESUME_EXTRACTION_SYSTEM_PROMPT,
    user: buildResumeExtractionUserPrompt(text),
    maxTokens: 4096,
  });

  let json: unknown;
  try {
    json = parseJsonObject(raw);
  } catch {
    throw new AppError(502, 'The AI returned an unreadable response. Please try uploading again.');
  }
  const parsed = structuredResumeSchema.safeParse(json);
  if (!parsed.success) throw new AppError(502, 'The AI returned an incomplete analysis. Please try uploading again.');

  return groundInSourceText(parsed.data, text);
}
