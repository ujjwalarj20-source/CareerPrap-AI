import { z } from 'zod';

const optStr = z
  .string()
  .nullish()
  .transform((v) => v?.trim() || null);

const strList = z
  .array(z.string())
  .nullish()
  .transform((v) => [...new Set((v ?? []).map((s) => s.trim()).filter(Boolean))]);

export const structuredJdSchema = z.object({
  jobTitle: optStr,
  company: optStr,
  requiredSkills: strList,
  preferredSkills: strList,
  technologies: strList,
  keywords: strList,
  softSkills: strList,
  responsibilities: strList,
  educationRequirements: strList,
  otherRequirements: strList,
  /** Minimum years of experience explicitly asked for, if any. */
  minYearsExperience: z
    .number()
    .nullish()
    .transform((v) => (v == null || v < 0 || v > 40 ? null : Math.round(v * 10) / 10)),
});

export type StructuredJd = z.output<typeof structuredJdSchema>;
