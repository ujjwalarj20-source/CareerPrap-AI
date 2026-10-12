import { env } from '../config/env';
import { parseJdLocally } from '../parsing/localJdParser';
import { AppError } from '../utils/AppError';
import { completeText, parseJsonObject } from './llm.client';
import { JD_EXTRACTION_SYSTEM_PROMPT, buildJdExtractionUserPrompt } from './prompts/jdExtraction.prompt';
import { StructuredJd, structuredJdSchema } from './schemas/jd.schema';

const squash = (s: string) => s.toLowerCase().replace(/\s+/g, ' ');

/**
 * Anti-hallucination pass: skills, technologies and keywords must literally appear in the
 * job description text, otherwise they are dropped. A skill can't be both required and preferred.
 */
export function groundInJdText(data: StructuredJd, sourceText: string): StructuredJd {
  const haystack = squash(sourceText);
  const grounded = (list: string[]) => list.filter((item) => haystack.includes(squash(item)));
  const requiredSkills = grounded(data.requiredSkills);
  const requiredSet = new Set(requiredSkills.map(squash));
  return {
    ...data,
    requiredSkills,
    preferredSkills: grounded(data.preferredSkills).filter((s) => !requiredSet.has(squash(s))),
    technologies: grounded(data.technologies),
    keywords: grounded(data.keywords),
    softSkills: grounded(data.softSkills),
  };
}

export async function extractJd(jdText: string): Promise<StructuredJd> {
  if (env.AI_PROVIDER === 'local') return groundInJdText(parseJdLocally(jdText), jdText);
  const raw = await completeText({
    system: JD_EXTRACTION_SYSTEM_PROMPT,
    user: buildJdExtractionUserPrompt(jdText),
    maxTokens: 3000,
  });

  let json: unknown;
  try {
    json = parseJsonObject(raw);
  } catch {
    throw new AppError(502, 'The AI returned an unreadable response. Please try again.');
  }
  const parsed = structuredJdSchema.safeParse(json);
  if (!parsed.success) throw new AppError(502, 'The AI returned an incomplete analysis. Please try again.');

  return groundInJdText(parsed.data, jdText);
}
