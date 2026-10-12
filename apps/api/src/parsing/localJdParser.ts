import { StructuredJd, structuredJdSchema } from '../ai/schemas/jd.schema';
import { KEYWORD_PHRASES, SOFT_SKILLS, TECH_TERMS, findTerms } from './dictionary';

/**
 * Rule-based job-description parser. No external service: skills, keywords and requirements are
 * only ever taken from the JD text itself.
 */

type Kind = 'required' | 'preferred' | 'responsibilities' | 'about' | 'benefits';

const SECTION_PATTERNS: [Kind, RegExp][] = [
  ['preferred', /(preferred|nice[\s-]to[\s-]have|good[\s-]to[\s-]have|bonus|desired|a\s+plus|plus\s+points?|would\s+be\s+a\s+plus|extra\s+points?)/i],
  ['required', /(requirements?|qualifications?|must[\s-]have|what\s+(you(?:'|’)ll|you\s+will)\s+need|what\s+we(?:'|’)re\s+looking\s+for|what\s+you\s+bring|who\s+you\s+are|required|skills|minimum|you\s+have|about\s+you|your\s+profile)/i],
  ['responsibilities', /(responsibilit|what\s+you(?:'|’)ll\s+do|what\s+you\s+will\s+do|duties|your\s+role|the\s+role|key\s+tasks|day[\s-]to[\s-]day|you\s+will)/i],
  ['benefits', /(benefits|perks|what\s+we\s+offer|compensation|why\s+join|we\s+offer)/i],
  ['about', /(about\s+(us|the\s+company|the\s+team)|who\s+we\s+are|company\s+overview|overview)/i],
];

const BULLET = /^\s*([•●▪■◦○▶►✓✔*\-–—·]|\d+[.)])\s+/;
const DEGREE =
  /\b(bachelor'?s?|master'?s?|ph\.?d|doctorate|b\.?\s?tech|m\.?\s?tech|b\.?\s?e\b|b\.?\s?sc|m\.?\s?sc|bca|mca|mba|degree|diploma|b\.?\s?s\b|m\.?\s?s\b)\b/i;
const OTHER_REQ = /\b(certif(?:ied|ication)s?|security\s+clearance|work\s+authori[sz]ation|visa|sponsorship|relocat\w+|willing\s+to\s+travel|on[\s-]?site|hybrid|remote|shift|notice\s+period)\b/i;

const clean = (s: string) => s.replace(/\s+/g, ' ').trim();
const stripBullet = (s: string) => s.replace(BULLET, '').trim();

/** A short line (optionally ending with ":") that names a section. */
function headingKind(line: string): Kind | null {
  const t = line.replace(/[:：]+$/, '').replace(/^[#*_\s]+|[#*_\s]+$/g, '');
  if (!t || t.length > 60 || BULLET.test(line) || /[.!?]$/.test(t)) return null;
  if (t.split(' ').length > 8) return null;
  for (const [kind, re] of SECTION_PATTERNS) if (re.test(t)) return kind;
  return null;
}

function splitSections(lines: string[]): { kind: Kind | null; lines: string[] }[] {
  const out: { kind: Kind | null; lines: string[] }[] = [{ kind: null, lines: [] }];
  for (const line of lines) {
    const kind = headingKind(line.trim());
    if (kind) out.push({ kind, lines: [] });
    else out[out.length - 1].lines.push(line);
  }
  return out;
}

function parseTitle(lines: string[], text: string): string | null {
  const labelled = text.match(/(?:job\s+title|position|role|title|opening)\s*[:\-–]\s*([^\n]{3,80})/i);
  if (labelled) return clean(labelled[1]);
  const first = clean(lines.find((l) => l.trim()) ?? '');
  if (first && first.length <= 80 && first.split(' ').length <= 10 && !/[.!?]$/.test(first)) {
    const m = first.match(/^(?:we(?:'|’)re\s+hiring[:,\s]+|hiring[:,\s]+|looking\s+for\s+(?:an?\s+)?)?(.+?)(?:\s+(?:at|@|[-–|])\s+.+)?$/i);
    return clean(m?.[1] ?? first);
  }
  return null;
}

function parseCompany(lines: string[], text: string): string | null {
  const labelled = text.match(/(?:company|organi[sz]ation|employer)\s*[:\-–]\s*([^\n]{2,60})/i);
  if (labelled) return clean(labelled[1]);
  const first = clean(lines.find((l) => l.trim()) ?? '');
  const m = first.match(/\s(?:at|@|[-–|])\s+([A-Z][\w&.,' -]{1,40})$/);
  return m ? clean(m[1]) : null;
}

function parseMinYears(text: string): number | null {
  const found: number[] = [];
  for (const line of text.split('\n')) {
    if (!/experience|exp\b|years?\s+of/i.test(line)) continue;
    for (const m of line.matchAll(/(\d{1,2})(?:\.\d+)?\s*(?:\+|plus)?\s*(?:[-–]|to)?\s*(?:\d{1,2})?\s*\+?\s*(?:years?|yrs?)\b/gi)) {
      const n = Number(m[1]);
      if (n > 0 && n <= 40) found.push(n);
    }
  }
  return found.length ? Math.min(...found) : null;
}

/** Items from explicit "Skills: a, b, c" style lines (short comma lists only). */
function labelledSkillLists(text: string): string[] {
  const out: string[] = [];
  for (const m of text.matchAll(/(?:skills?|technologies|tech\s+stack|tools|stack)\s*[:\-–]\s*([^\n]+)/gi)) {
    for (const part of m[1].split(/[,;/|]/)) {
      const item = clean(part.replace(/[.]$/, ''));
      if (item.length >= 2 && item.length <= 30 && item.split(' ').length <= 3) out.push(item);
    }
  }
  return out;
}

const unique = (items: string[]) => {
  const seen = new Set<string>();
  return items.filter((i) => {
    const k = i.toLowerCase();
    if (!i || seen.has(k)) return false;
    seen.add(k);
    return true;
  });
};

export function parseJdLocally(rawText: string): StructuredJd {
  const text = rawText.replace(/\r\n?/g, '\n');
  const lines = text.split('\n');
  const sections = splitSections(lines);

  const textOf = (kinds: (Kind | null)[]) =>
    sections.filter((s) => kinds.includes(s.kind)).map((s) => s.lines.join('\n')).join('\n');

  const preferredText = textOf(['preferred']);
  const hasRequiredSection = sections.some((s) => s.kind === 'required');
  // Skills named under a "requirements" heading are required; with no such heading, everything outside
  // the preferred/benefits/about parts is treated as required.
  const requiredText = hasRequiredSection ? textOf(['required']) : textOf([null, 'required', 'responsibilities']);
  const labelled = labelledSkillLists(requiredText);
  const requiredSkills = unique([...findTerms(requiredText, TECH_TERMS), ...labelled]);
  const requiredSet = new Set(requiredSkills.map((s) => s.toLowerCase()));

  // "Nice to have" can also be an inline phrase: "... Docker is a plus", "Preferred: AWS".
  const inlinePreferred = lines
    .filter((l) => /\b(preferred|nice[\s-]to[\s-]have|bonus|a\s+plus|good\s+to\s+have)\b/i.test(l) && !headingKind(l.trim()))
    .join('\n');
  const preferredSkills = unique([...findTerms(`${preferredText}\n${inlinePreferred}`, TECH_TERMS)]).filter(
    (s) => !requiredSet.has(s.toLowerCase()),
  );
  const preferredSet = new Set(preferredSkills.map((s) => s.toLowerCase()));

  const technologies = findTerms(text, TECH_TERMS);
  const keywords = unique([
    ...findTerms(text, KEYWORD_PHRASES),
    ...technologies.filter((t) => !requiredSet.has(t.toLowerCase()) && !preferredSet.has(t.toLowerCase())),
  ]).slice(0, 25);

  const responsibilities = sections
    .filter((s) => s.kind === 'responsibilities')
    .flatMap((s) => s.lines)
    .map((l) => stripBullet(clean(l)))
    .filter((l) => l.length >= 8)
    .slice(0, 20);

  const nonEmpty = lines.map(clean).filter(Boolean);
  const educationRequirements = unique(
    nonEmpty.filter((l) => DEGREE.test(l) && /required|preferred|must|minimum|degree|qualification|bachelor|master|diploma|b\.?tech|m\.?tech|ph\.?d/i.test(l)).map((l) => stripBullet(l).slice(0, 200)),
  ).slice(0, 5);

  const otherRequirements = unique(
    nonEmpty.filter((l) => OTHER_REQ.test(l) && l.length <= 200 && !DEGREE.test(l)).map((l) => stripBullet(l)),
  ).slice(0, 8);

  return structuredJdSchema.parse({
    jobTitle: parseTitle(lines, text),
    company: parseCompany(lines, text),
    requiredSkills,
    preferredSkills,
    technologies,
    keywords,
    softSkills: findTerms(text, SOFT_SKILLS),
    responsibilities,
    educationRequirements,
    otherRequirements,
    minYearsExperience: parseMinYears(text),
  });
}
