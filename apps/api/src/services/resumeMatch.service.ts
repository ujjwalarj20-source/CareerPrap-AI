import type { StructuredJd } from '../ai/schemas/jd.schema';
import type { StructuredResume } from '../ai/schemas/resume.schema';

/**
 * Deterministic Resume-vs-JD comparison. No AI is involved here: every "match" is backed by
 * text that literally exists in the resume, and every "missing" item literally exists in the JD.
 * This is a Resume-JD Match Score, NOT a prediction of being hired or selected.
 */

export type Level = 'Strong' | 'Partial' | 'Weak' | 'Not specified' | 'Unknown';

export interface ItemMatch {
  matched: string[];
  missing: string[];
}

export interface MatchResult {
  score: number;
  scoreBreakdown: { label: string; score: number; weight: number }[];
  requiredSkills: ItemMatch;
  preferredSkills: ItemMatch;
  technologies: ItemMatch;
  keywords: ItemMatch;
  experience: { level: Level; requiredYears: number | null; resumeYears: number | null; note: string };
  role: { level: Level; jdTitle: string | null; matchedTitle: string | null; note: string };
  education: { level: Level; note: string };
  ats: { score: number; level: 'Good' | 'Fair' | 'Needs work'; checks: { label: string; ok: boolean; tip: string }[] };
  gaps: string[];
  suggestions: string[];
}

/* ---------- term normalisation & matching ---------- */

const ALIASES: Record<string, string> = {
  js: 'javascript',
  ts: 'typescript',
  nodejs: 'node',
  'node.js': 'node',
  'node js': 'node',
  reactjs: 'react',
  'react.js': 'react',
  'react js': 'react',
  vuejs: 'vue',
  'vue.js': 'vue',
  angularjs: 'angular',
  nextjs: 'next',
  'next.js': 'next',
  expressjs: 'express',
  'express.js': 'express',
  postgres: 'postgresql',
  mongo: 'mongodb',
  k8s: 'kubernetes',
  golang: 'go',
  'amazon web services': 'aws',
  'google cloud': 'gcp',
  'google cloud platform': 'gcp',
  'rest api': 'rest',
  'rest apis': 'rest',
  restful: 'rest',
  'restful api': 'rest',
  'restful apis': 'rest',
  'ci/cd': 'cicd',
  'ci cd': 'cicd',
  ml: 'machine learning',
};

export function normalizeTerm(raw: string): string {
  const t = raw
    .toLowerCase()
    .replace(/[()]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()
    .replace(/[,;:]+$/g, '');
  return ALIASES[t] ?? t;
}

const escapeRe = (s: string) => s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

/** Every spelling that should count as the same term (the canonical form plus aliases pointing to it). */
function variants(term: string): string[] {
  const canon = normalizeTerm(term);
  const out = new Set([canon, term.toLowerCase().trim()]);
  for (const [alias, target] of Object.entries(ALIASES)) if (target === canon) out.add(alias);
  return [...out].filter(Boolean);
}

function appearsIn(term: string, haystackLower: string): boolean {
  return variants(term).some((v) => new RegExp(`(?<![a-z0-9])${escapeRe(v)}(?![a-z0-9])`).test(haystackLower));
}

function compareList(items: string[], haystackLower: string): ItemMatch {
  const seen = new Set<string>();
  const matched: string[] = [];
  const missing: string[] = [];
  for (const item of items) {
    const key = normalizeTerm(item);
    if (seen.has(key)) continue;
    seen.add(key);
    (appearsIn(item, haystackLower) ? matched : missing).push(item);
  }
  return { matched, missing };
}

/* ---------- resume text corpus ---------- */

function resumeCorpus(r: StructuredResume, rawText?: string | null): string {
  if (rawText && rawText.trim()) return rawText.toLowerCase();
  const parts = [
    r.summary,
    ...r.skills,
    ...r.jobTitles,
    ...r.achievements,
    ...r.experience.flatMap((e) => [e.title, e.company, ...e.highlights]),
    ...r.projects.flatMap((p) => [p.name, p.description, ...p.technologies]),
    ...r.certifications.map((c) => c.name),
    ...r.education.flatMap((e) => [e.degree, e.field]),
  ];
  return parts.filter(Boolean).join('\n').toLowerCase();
}

/* ---------- individual dimensions ---------- */

const ratio = (m: ItemMatch) => m.matched.length / Math.max(1, m.matched.length + m.missing.length);
const total = (m: ItemMatch) => m.matched.length + m.missing.length;

function levelFor(r: number): Level {
  return r >= 0.75 ? 'Strong' : r >= 0.4 ? 'Partial' : 'Weak';
}

function matchExperience(r: StructuredResume, jd: StructuredJd): MatchResult['experience'] {
  const required = jd.minYearsExperience;
  const have = r.yearsOfExperience;
  if (required == null) {
    return { level: 'Not specified', requiredYears: null, resumeYears: have, note: 'The job description does not state a minimum experience.' };
  }
  if (have == null) {
    return { level: 'Unknown', requiredYears: required, resumeYears: null, note: `The job asks for ${required}+ years, but your total experience could not be determined from the resume dates.` };
  }
  const ratioYears = have / required;
  const level: Level = ratioYears >= 1 ? 'Strong' : ratioYears >= 0.7 ? 'Partial' : 'Weak';
  return {
    level,
    requiredYears: required,
    resumeYears: have,
    note: `The job asks for ${required}+ years; your resume shows about ${have}.`,
  };
}

const TITLE_NOISE = new Set(['a', 'an', 'the', 'and', 'of', 'for', 'in', 'at', 'to', 'i', 'ii', 'iii']);
const titleTokens = (t: string) =>
  normalizeTerm(t)
    .split(/[^a-z0-9+#.]+/)
    .filter((w) => w && !TITLE_NOISE.has(w));

function matchRole(r: StructuredResume, jd: StructuredJd): MatchResult['role'] {
  if (!jd.jobTitle) return { level: 'Not specified', jdTitle: null, matchedTitle: null, note: 'No job title was found in the job description.' };
  const titles = [...new Set([...r.jobTitles, ...r.experience.map((e) => e.title ?? '')].filter(Boolean))];
  if (titles.length === 0) return { level: 'Unknown', jdTitle: jd.jobTitle, matchedTitle: null, note: 'No job titles were found in your resume.' };

  const want = new Set(titleTokens(jd.jobTitle));
  let best = { title: titles[0], overlap: 0 };
  for (const t of titles) {
    const have = new Set(titleTokens(t));
    const common = [...want].filter((w) => have.has(w)).length;
    const overlap = common / Math.max(1, want.size);
    if (overlap > best.overlap) best = { title: t, overlap };
  }
  const level: Level = best.overlap >= 0.67 ? 'Strong' : best.overlap >= 0.34 ? 'Partial' : 'Weak';
  return {
    level,
    jdTitle: jd.jobTitle,
    matchedTitle: best.overlap > 0 ? best.title : null,
    note:
      level === 'Weak'
        ? `None of your past titles closely resemble "${jd.jobTitle}".`
        : `Your title "${best.title}" ${level === 'Strong' ? 'closely matches' : 'partly matches'} "${jd.jobTitle}".`,
  };
}

const DEGREE_LEVELS: { rank: number; name: string; re: RegExp }[] = [
  { rank: 4, name: 'Doctorate', re: /\b(ph\.?d|doctorate|doctoral)\b/i },
  { rank: 3, name: "Master's", re: /\b(master'?s?|m\.?\s?tech|m\.?\s?sc|m\.?\s?eng|mba|m\.?\s?s\b|mca)\b/i },
  { rank: 2, name: "Bachelor's", re: /\b(bachelor'?s?|b\.?\s?tech|b\.?\s?sc|b\.?\s?e\b|b\.?\s?eng|b\.?\s?a\b|bca|undergraduate)\b/i },
  { rank: 1, name: 'Diploma', re: /\b(diploma|associate)\b/i },
];

function degreeRank(text: string): { rank: number; name: string } | null {
  for (const d of DEGREE_LEVELS) if (d.re.test(text)) return { rank: d.rank, name: d.name };
  return null;
}

function matchEducation(r: StructuredResume, jd: StructuredJd): MatchResult['education'] {
  if (jd.educationRequirements.length === 0) return { level: 'Not specified', note: 'The job description does not list an education requirement.' };
  const need = jd.educationRequirements.map(degreeRank).filter((x): x is { rank: number; name: string } => !!x);
  if (need.length === 0) return { level: 'Unknown', note: `Education requirement: ${jd.educationRequirements.join('; ')}.` };
  const required = Math.min(...need.map((n) => n.rank)); // any listed level is acceptable
  const requiredName = need.find((n) => n.rank === required)!.name;

  const have = r.education.map((e) => degreeRank(`${e.degree ?? ''}`)).filter((x): x is { rank: number; name: string } => !!x);
  if (have.length === 0) {
    return r.education.length
      ? { level: 'Unknown', note: `The job asks for ${requiredName} or equivalent; your degree level could not be determined.` }
      : { level: 'Weak', note: `The job asks for ${requiredName}, but no education was found in your resume.` };
  }
  const best = have.reduce((a, b) => (b.rank > a.rank ? b : a));
  return best.rank >= required
    ? { level: 'Strong', note: `Your ${best.name} meets the ${requiredName} requirement.` }
    : { level: 'Weak', note: `The job asks for ${requiredName}; your highest listed degree is ${best.name}.` };
}

/* ---------- ATS compatibility (about the resume's structure, independent of the JD) ---------- */

function atsCheck(r: StructuredResume, rawText?: string | null): MatchResult['ats'] {
  const words = rawText ? rawText.split(/\s+/).filter(Boolean).length : null;
  const datedRoles = r.experience.filter((e) => e.startDate).length;
  const checks = [
    { label: 'Email address found', ok: !!r.email, tip: 'Add a plain-text email address near the top.' },
    { label: 'Phone number found', ok: !!r.phone, tip: 'Add a phone number near the top.' },
    { label: 'Skills section found', ok: r.skills.length > 0, tip: 'Add a clearly labelled "Skills" section.' },
    { label: 'Work experience found', ok: r.experience.length > 0, tip: 'Use a clear "Experience" heading with job titles and companies.' },
    { label: 'Education found', ok: r.education.length > 0, tip: 'Add an "Education" section.' },
    { label: 'Professional summary found', ok: !!r.summary, tip: 'A short summary at the top helps ATS and recruiters.' },
    {
      label: 'Roles have dates',
      ok: r.experience.length > 0 && datedRoles === r.experience.length,
      tip: 'Add start and end dates (e.g. "Jan 2021 – Present") to every role.',
    },
    {
      label: 'Text is machine-readable',
      ok: words == null ? true : words >= 150,
      tip: 'Very little text could be read. Avoid images, tables or text boxes for key content.',
    },
  ];
  const score = Math.round((checks.filter((c) => c.ok).length / checks.length) * 100);
  return { score, level: score >= 80 ? 'Good' : score >= 60 ? 'Fair' : 'Needs work', checks };
}

/* ---------- main entry ---------- */

const WEIGHTS = { required: 40, preferred: 10, technologies: 10, keywords: 10, experience: 15, role: 10, education: 5 };
const LEVEL_VALUE: Partial<Record<Level, number>> = { Strong: 1, Partial: 0.5, Weak: 0 };

export function computeMatch(resume: StructuredResume, resumeText: string | null | undefined, jd: StructuredJd): MatchResult {
  const corpus = resumeCorpus(resume, resumeText);

  const requiredSkills = compareList(jd.requiredSkills, corpus);
  const preferredSkills = compareList(jd.preferredSkills, corpus);
  // Technologies/keywords already counted as skills are not double-reported as separate gaps.
  const counted = new Set([...jd.requiredSkills, ...jd.preferredSkills].map(normalizeTerm));
  const technologies = compareList(jd.technologies.filter((t) => !counted.has(normalizeTerm(t))), corpus);
  const keywords = compareList(
    jd.keywords.filter((k) => !counted.has(normalizeTerm(k))),
    corpus,
  );
  const experience = matchExperience(resume, jd);
  const role = matchRole(resume, jd);
  const education = matchEducation(resume, jd);

  // Dimensions the JD doesn't speak about (or we can't evaluate) are left out and the rest re-weighted.
  const dims: { label: string; weight: number; value: number | null }[] = [
    { label: 'Required skills', weight: WEIGHTS.required, value: total(requiredSkills) ? ratio(requiredSkills) : null },
    { label: 'Preferred skills', weight: WEIGHTS.preferred, value: total(preferredSkills) ? ratio(preferredSkills) : null },
    { label: 'Technologies & tools', weight: WEIGHTS.technologies, value: total(technologies) ? ratio(technologies) : null },
    { label: 'Keywords', weight: WEIGHTS.keywords, value: total(keywords) ? ratio(keywords) : null },
    { label: 'Experience', weight: WEIGHTS.experience, value: LEVEL_VALUE[experience.level] ?? null },
    { label: 'Role / title', weight: WEIGHTS.role, value: LEVEL_VALUE[role.level] ?? null },
    { label: 'Education', weight: WEIGHTS.education, value: LEVEL_VALUE[education.level] ?? null },
  ];
  const used = dims.filter((d) => d.value !== null);
  const weightSum = used.reduce((s, d) => s + d.weight, 0);
  const score = weightSum ? Math.round((used.reduce((s, d) => s + d.weight * (d.value as number), 0) / weightSum) * 100) : 0;
  const scoreBreakdown = used.map((d) => ({ label: d.label, score: Math.round((d.value as number) * 100), weight: Math.round((d.weight / weightSum) * 100) }));

  const ats = atsCheck(resume, resumeText);

  const gaps: string[] = [];
  if (requiredSkills.missing.length) gaps.push(`Missing required skills: ${requiredSkills.missing.join(', ')}.`);
  if (experience.level === 'Weak') gaps.push(experience.note);
  if (role.level === 'Weak') gaps.push(role.note);
  if (education.level === 'Weak') gaps.push(education.note);
  if (preferredSkills.missing.length) gaps.push(`Missing preferred skills: ${preferredSkills.missing.join(', ')}.`);

  const suggestions: string[] = [];
  if (requiredSkills.missing.length) {
    suggestions.push(
      `If you genuinely have experience with ${requiredSkills.missing.slice(0, 5).join(', ')}, add it to your Skills section and to the relevant job or project bullet points. If you don't, consider learning or building a small project with the most important one.`,
    );
  }
  if (keywords.missing.length) {
    suggestions.push(`Where truthful, mirror the job's wording for: ${keywords.missing.slice(0, 6).join(', ')}.`);
  }
  if (role.level === 'Weak' || role.level === 'Partial') {
    suggestions.push(`Make the connection to "${jd.jobTitle}" clearer in your summary and recent role descriptions.`);
  }
  if (experience.level === 'Weak' || experience.level === 'Partial') {
    suggestions.push('Highlight the scope, duration and impact of your most relevant work to make up for the experience gap.');
  }
  for (const c of ats.checks.filter((c) => !c.ok)) suggestions.push(c.tip);

  return { score, scoreBreakdown, requiredSkills, preferredSkills, technologies, keywords, experience, role, education, ats, gaps, suggestions };
}
