import { z } from 'zod';

/** Trimmed string; null/undefined/empty all collapse to null. */
const optStr = z
  .string()
  .nullish()
  .transform((v) => v?.trim() || null);

const strList = z
  .array(z.string())
  .nullish()
  .transform((v) => (v ?? []).map((s) => s.trim()).filter(Boolean));

const list = <T extends z.ZodTypeAny>(item: T) =>
  z
    .array(item)
    .nullish()
    .transform((v) => v ?? []);

export const structuredResumeSchema = z.object({
  name: optStr,
  email: optStr,
  phone: optStr,
  summary: optStr,
  skills: strList,
  experience: list(
    z.object({
      title: optStr,
      company: optStr,
      location: optStr,
      startDate: optStr,
      endDate: optStr,
      highlights: strList,
    }),
  ),
  education: list(
    z.object({
      degree: optStr,
      field: optStr,
      institution: optStr,
      startDate: optStr,
      endDate: optStr,
      grade: optStr,
    }),
  ),
  projects: list(z.object({ name: optStr, description: optStr, technologies: strList })),
  certifications: list(z.object({ name: optStr, issuer: optStr, date: optStr })),
  achievements: strList,
  languages: strList,
  jobTitles: strList,
  yearsOfExperience: z
    .number()
    .nullish()
    .transform((v) => (v == null || v < 0 || v > 60 ? null : Math.round(v * 10) / 10)),
});

export type StructuredResume = z.output<typeof structuredResumeSchema>;
