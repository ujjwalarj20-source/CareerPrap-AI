import { StructuredResume, structuredResumeSchema } from '../ai/schemas/resume.schema';
import { TECH_TERMS, findTerms } from './dictionary';

/**
 * Rule-based resume parser. No external service, no AI: every value returned is a piece of the
 * resume text (or a number computed from dates written in it). Anything not found stays null / [].
 */

type SectionKey = 'summary' | 'skills' | 'experience' | 'education' | 'projects' | 'certifications' | 'achievements' | 'languages';

const HEADINGS: Record<SectionKey, RegExp> = {
  summary: /^(professional\s+summary|career\s+summary|summary|profile|professional\s+profile|objective|career\s+objective|about\s+me|about)$/i,
  skills: /^(technical\s+skills|core\s+skills|key\s+skills|skills(\s*(&|and)\s*(tools|technologies))?|core\s+competencies|competencies|technologies|tech\s+stack|tools(\s*(&|and)\s*technologies)?|areas\s+of\s+expertise)$/i,
  experience: /^((professional|work|relevant|industry)\s+)?(experience|employment(\s+history)?|work\s+history|career\s+history)$/i,
  education: /^(education(al)?(\s+(background|qualifications?))?|academic(s|\s+background|\s+qualifications?)?|qualifications?)$/i,
  projects: /^((personal|academic|key|selected|major|notable)\s+)?projects?$/i,
  certifications: /^(certifications?(\s*(&|and)\s*(courses|licenses?|training))?|licenses?(\s*(&|and)\s*certifications?)?|certificates?|courses|training)$/i,
  achievements: /^(achievements?|accomplishments?|awards?(\s*(&|and)\s*(honou?rs|achievements?|recognition))?|honou?rs|recognition|extra[\s-]?curricular(\s+activities)?)$/i,
  languages: /^(languages?|language\s+proficiency|spoken\s+languages)$/i,
};

const MONTHS = '(?:jan(?:uary)?|feb(?:ruary)?|mar(?:ch)?|apr(?:il)?|may|jun(?:e)?|jul(?:y)?|aug(?:ust)?|sep(?:t(?:ember)?)?|oct(?:ober)?|nov(?:ember)?|dec(?:ember)?)';
const DATE = `(?:${MONTHS}\\.?\\s+(?:19|20)\\d{2}|(?:0?[1-9]|1[0-2])[/-](?:19|20)\\d{2}|(?:19|20)\\d{2})`;
const END = `(?:${DATE}|present|current|now|ongoing|till\\s+date|to\\s+date)`;
const DATE_RANGE = new RegExp(`(${DATE})\\s*(?:-|–|—|to|until)\\s*(${END})`, 'i');

const BULLET = /^\s*([•●▪■◦○▶►✓✔*\-–—·]|\d+[.)])\s+/;
const EMAIL = /[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}/;
const PHONE = /(?:\+?\d{1,3}[\s.-]?)?(?:\(\d{2,4}\)[\s.-]?)?\d{3,5}[\s.-]?\d{3,5}(?:[\s.-]?\d{2,5})?/;

const TITLE_WORDS =
  /\b(engineer|developer|manager|analyst|intern(ship)?|lead|designer|consultant|architect|specialist|administrator|officer|director|associate|executive|scientist|tester|qa|programmer|coordinator|head|president|trainee|assistant|supervisor|technician|researcher|teacher|professor|founder|co-founder|owner)\b/i;
const INSTITUTION_WORDS = /\b(university|college|institute|school|academy|polytechnic|iit|nit|iiit|bits)\b/i;
const DEGREE_WORDS =
  /\b(b\.?\s?tech|m\.?\s?tech|b\.?\s?e\b|m\.?\s?e\b|b\.?\s?sc|m\.?\s?sc|b\.?\s?com|m\.?\s?com|b\.?\s?a\b|m\.?\s?a\b|bca|mca|bba|mba|ph\.?d|bachelor'?s?|master'?s?|doctorate|diploma|associate\s+degree|b\.?\s?s\b|m\.?\s?s\b|hsc|ssc|higher\s+secondary|secondary\s+school|12th|10th)\b/i;

const clean = (s: string) => s.replace(/\s+/g, ' ').trim();
const stripBullet = (s: string) => s.replace(BULLET, '').trim();
const isBullet = (s: string) => BULLET.test(s);

/* ---------- sections ---------- */

function headingOf(line: string): SectionKey | null {
  const t = line.replace(/[:：]+$/, '').replace(/^[#\s_=\-*]+|[#\s_=\-*]+$/g, '').trim();
  if (!t || t.length > 45) return null;
  for (const key of Object.keys(HEADINGS) as SectionKey[]) if (HEADINGS[key].test(t)) return key;
  return null;
}

function splitSections(lines: string[]): { header: string[]; sections: Partial<Record<SectionKey, string[]>> } {
  const header: string[] = [];
  const sections: Partial<Record<SectionKey, string[]>> = {};
  let current: SectionKey | null = null;
  for (const line of lines) {
    const h = headingOf(line);
    if (h) {
      current = h;
      sections[h] ??= [];
      continue;
    }
    if (current) sections[current]!.push(line);
    else header.push(line);
  }
  return { header, sections };
}

/* ---------- dates / years ---------- */

const MONTH_INDEX: Record<string, number> = { jan: 0, feb: 1, mar: 2, apr: 3, may: 4, jun: 5, jul: 6, aug: 7, sep: 8, oct: 9, nov: 10, dec: 11 };

/** Returns months since year 0, or null. `isEnd` makes a bare year mean December. */
function toMonthIndex(raw: string, isEnd: boolean, now = new Date()): number | null {
  const t = raw.toLowerCase().trim();
  if (/present|current|now|ongoing|date/.test(t)) return now.getFullYear() * 12 + now.getMonth();
  const year = t.match(/(?:19|20)\d{2}/);
  if (!year) return null;
  const y = Number(year[0]);
  const named = t.match(/[a-z]{3}/);
  if (named && named[0] in MONTH_INDEX) return y * 12 + MONTH_INDEX[named[0]];
  const num = t.match(/^(0?[1-9]|1[0-2])[/-]/);
  if (num) return y * 12 + Number(num[1]) - 1;
  return y * 12 + (isEnd ? 11 : 0);
}

export function yearsFromRanges(ranges: { start: string; end: string }[]): number | null {
  const spans = ranges
    .map((r) => [toMonthIndex(r.start, false), toMonthIndex(r.end, true)] as const)
    .filter((s): s is readonly [number, number] => s[0] !== null && s[1] !== null && s[1] >= s[0])
    .map(([a, b]) => [a, b + 1] as [number, number])
    .sort((x, y) => x[0] - y[0]);
  if (spans.length === 0) return null;
  let months = 0;
  let [curStart, curEnd] = spans[0];
  for (const [s, e] of spans.slice(1)) {
    if (s <= curEnd) curEnd = Math.max(curEnd, e);
    else {
      months += curEnd - curStart;
      [curStart, curEnd] = [s, e];
    }
  }
  months += curEnd - curStart;
  return Math.round((months / 12) * 10) / 10;
}

/* ---------- field parsers ---------- */

function parseName(header: string[], email: string | null): string | null {
  for (const raw of header.slice(0, 6)) {
    const line = clean(raw.replace(/\|.*$/, ''));
    if (!line || line.length > 45 || /@|https?:|www\.|\d{3}|linkedin|github/i.test(line)) continue;
    if (/resume|curriculum|vitae|cv\b/i.test(line)) continue;
    const words = line.split(' ');
    if (words.length < 2 || words.length > 4) continue;
    if (words.every((w) => /^[A-Za-z][A-Za-z.'’-]*$/.test(w))) return line;
  }
  // Fall back to a name-like email local part only if nothing else matched? No: never guess.
  void email;
  return null;
}

function parsePhone(text: string): string | null {
  for (const m of text.matchAll(new RegExp(PHONE, 'g'))) {
    const digits = m[0].replace(/\D/g, '');
    if (digits.length >= 8 && digits.length <= 15 && !/^(19|20)\d{2}(19|20)\d{2}$/.test(digits)) return clean(m[0]);
  }
  return null;
}

function parseSkills(lines: string[]): string[] {
  const out: string[] = [];
  for (const raw of lines) {
    // Split on separators first, then drop a "Languages:" style category label from each piece.
    for (const part of stripBullet(raw).split(/[,;|•●▪·/]|\s{3,}/)) {
      const item = clean(part).replace(/^[^:]{1,40}:\s*/, '').replace(/^[-–—:]+|[.:]+$/g, '').trim();
      if (item.length >= 1 && item.length <= 40 && item.split(' ').length <= 4) out.push(item);
    }
  }
  return dedupe(out);
}

function dedupe(items: string[]): string[] {
  const seen = new Set<string>();
  return items.filter((i) => {
    const k = i.toLowerCase();
    if (!i || seen.has(k)) return false;
    seen.add(k);
    return true;
  });
}

function splitTitleCompany(header: string): { title: string | null; company: string | null; location: string | null } {
  const text = clean(header.replace(/[|•·]+/g, ' | '));
  const parts = text
    .split(/\s+\|\s+|\s+[-–—]\s+|\s+at\s+|\s*,\s+(?=[A-Z])/)
    .map(clean)
    .filter(Boolean);
  let title: string | null = null;
  let company: string | null = null;
  let location: string | null = null;
  for (const p of parts) {
    if (!title && TITLE_WORDS.test(p)) title = p;
    else if (!company && !/^[A-Z][a-z]+(,\s*[A-Z][A-Za-z ]+)?$/.test(p)) company = p;
    else if (!location) location = p;
  }
  if (!title && parts.length) title = parts[0];
  if (title && company === title) company = null;
  return { title, company, location };
}

function parseExperience(lines: string[]): StructuredResume['experience'] {
  type Entry = StructuredResume['experience'][number];
  const entries: Entry[] = [];
  let current: Entry | null = null;
  let pendingHeader: string | null = null;

  for (let i = 0; i < lines.length; i++) {
    const raw = lines[i];
    const line = clean(raw);
    if (!line) continue;
    const range = DATE_RANGE.exec(line);
    if (range && !isBullet(raw)) {
      const rest = clean(line.replace(range[0], ' ').replace(/[()|,•·–—-]+\s*$/g, '').replace(/^[()|,•·–—-]+/g, ''));
      let headerText = rest;
      // Title/company often sit on the line above the dates.
      if ((!headerText || !TITLE_WORDS.test(headerText)) && pendingHeader) headerText = clean(`${pendingHeader} | ${headerText}`);
      const { title, company, location } = splitTitleCompany(headerText.replace(/\|\s*$/, ''));
      current = { title, company, location, startDate: clean(range[1]), endDate: clean(range[2]), highlights: [] };
      entries.push(current);
      pendingHeader = null;
      continue;
    }
    if (isBullet(raw)) {
      pendingHeader = null;
      current?.highlights.push(stripBullet(raw));
    } else if (line.length <= 90 && !/[.!?]$/.test(line)) {
      // Short non-bullet line: could be the next entry's "Title, Company" header, or a wrapped line.
      const next = lines.slice(i + 1).find((l) => clean(l));
      if (next && DATE_RANGE.test(next) && !isBullet(next)) pendingHeader = line;
      else if (current && current.highlights.length) current.highlights[current.highlights.length - 1] += ` ${line}`;
      else if (current) current.highlights.push(line);
    } else if (current) {
      const last = current.highlights.length - 1;
      if (last >= 0 && !/[.!?]$/.test(current.highlights[last])) current.highlights[last] += ` ${line}`;
      else current.highlights.push(line);
    }
  }
  return entries;
}

function parseEducation(lines: string[]): StructuredResume['education'] {
  const entries: StructuredResume['education'] = [];
  const joined = lines.map(clean).filter(Boolean);
  for (let i = 0; i < joined.length; i++) {
    const line = stripBullet(joined[i]);
    if (!DEGREE_WORDS.test(line)) continue;
    const window = [line, joined[i + 1] ?? '', joined[i - 1] ?? ''].join(' | ');
    const range = DATE_RANGE.exec(window);
    const years = window.match(/(?:19|20)\d{2}/g) ?? [];
    const gradeMatch = window.match(/(?:cgpa|gpa|percentage|grade)\s*[:\-]?\s*[\d.]+(?:\s*\/\s*\d+)?%?|\d{2}(?:\.\d+)?\s*%/i);
    const degreeLine = line.replace(DATE_RANGE, '').replace(/\b(?:19|20)\d{2}\b/g, '');
    const instLine = [line, joined[i + 1] ?? '', joined[i - 1] ?? ''].find((l) => INSTITUTION_WORDS.test(l));
    const degreeMatch = degreeLine.match(DEGREE_WORDS)?.[0] ?? null;
    const afterDegree = degreeLine.split(/\s+(?:in|of)\s+|,|\s[-–—|]\s/).map(clean).filter(Boolean);
    const field = afterDegree.find((p) => p !== degreeLine && !DEGREE_WORDS.test(p) && !INSTITUTION_WORDS.test(p) && !/cgpa|gpa|%/i.test(p)) ?? null;
    entries.push({
      degree: degreeMatch ? clean(degreeMatch) : null,
      field,
      institution: instLine ? clean(instLine.split(/\s*[,|]\s*|\s[-–—]\s/).find((p) => INSTITUTION_WORDS.test(p)) ?? instLine) : null,
      startDate: range ? clean(range[1]) : years.length > 1 ? (years[0] ?? null) : null,
      endDate: range ? clean(range[2]) : years.length ? (years[years.length - 1] ?? null) : null,
      grade: gradeMatch ? clean(gradeMatch[0]) : null,
    });
  }
  return entries;
}

function parseProjects(lines: string[]): StructuredResume['projects'] {
  const projects: StructuredResume['projects'] = [];
  let current: StructuredResume['projects'][number] | null = null;
  const desc: string[] = [];
  const flush = () => {
    if (current) current.description = clean(desc.join(' ')) || null;
    desc.length = 0;
  };
  for (const raw of lines) {
    const line = clean(raw);
    if (!line) continue;
    const tech = line.match(/^(?:tech(?:nologies)?(?:\s+used)?|tech\s+stack|stack|built\s+with|tools)\s*[:\-]\s*(.+)$/i);
    if (tech && current) {
      current.technologies = parseSkills([tech[1]]);
    } else if (!isBullet(raw) && line.length <= 100 && !/[.!?]$/.test(line)) {
      flush();
      const [name, rest] = line.split(/\s[-–—|]\s/, 2);
      current = { name: clean(name), description: null, technologies: [] };
      projects.push(current);
      if (rest) desc.push(rest);
    } else if (current) {
      desc.push(stripBullet(raw));
    }
  }
  flush();
  return projects;
}

function parseCertifications(lines: string[]): StructuredResume['certifications'] {
  return lines
    .map((l) => stripBullet(clean(l)))
    .filter(Boolean)
    .map((line) => {
      const date = line.match(/(?:19|20)\d{2}/)?.[0] ?? null;
      const noDate = clean(line.replace(/[(\[]?\b(?:19|20)\d{2}\b[)\]]?/g, '').replace(/[-–—|,]\s*$/, ''));
      const [name, issuer] = noDate.split(/\s+(?:[-–—|]|by|from|issued by)\s+/i, 2).map(clean);
      return { name: name || null, issuer: issuer || null, date };
    })
    .filter((c) => c.name);
}

const listLines = (lines: string[]) => lines.map((l) => stripBullet(clean(l))).filter(Boolean);

function parseLanguages(lines: string[]): string[] {
  const out: string[] = [];
  for (const line of listLines(lines)) {
    for (const part of line.split(/[,;|•·]/)) {
      const lang = clean(part.replace(/\(.*?\)/g, '').replace(/[-–:].*$/, ''));
      if (lang && lang.length <= 25 && lang.split(' ').length <= 2) out.push(lang);
    }
  }
  return dedupe(out);
}

/* ---------- entry point ---------- */

export function parseResumeLocally(rawText: string): StructuredResume {
  const text = rawText.replace(/\r\n?/g, '\n');
  const lines = text.split('\n');
  const { header, sections } = splitSections(lines);

  const email = EMAIL.exec(text)?.[0] ?? null;
  const phone = parsePhone(header.join('\n') || text.slice(0, 600));
  const experience = sections.experience ? parseExperience(sections.experience) : [];
  const education = sections.education ? parseEducation(sections.education) : [];

  let skills = sections.skills ? parseSkills(sections.skills) : [];
  if (skills.length === 0) skills = findTerms(text, TECH_TERMS); // no Skills section: only known terms that really appear

  const summaryText = sections.summary ? clean(sections.summary.join(' ')) : '';
  const titles = dedupe(experience.map((e) => e.title ?? '').filter(Boolean));

  return structuredResumeSchema.parse({
    name: parseName(header, email),
    email,
    phone,
    summary: summaryText || null,
    skills,
    experience,
    education,
    projects: sections.projects ? parseProjects(sections.projects) : [],
    certifications: sections.certifications ? parseCertifications(sections.certifications) : [],
    achievements: sections.achievements ? listLines(sections.achievements) : [],
    languages: sections.languages ? parseLanguages(sections.languages) : [],
    jobTitles: titles,
    yearsOfExperience: yearsFromRanges(experience.filter((e) => e.startDate && e.endDate).map((e) => ({ start: e.startDate!, end: e.endDate! }))),
  });
}
