import { structuredJdSchema } from '../src/ai/schemas/jd.schema';
import { structuredResumeSchema } from '../src/ai/schemas/resume.schema';
import { computeMatch } from '../src/services/resumeMatch.service';

const resume = structuredResumeSchema.parse({
  name: 'Asha Rao',
  email: 'asha@example.com',
  phone: '+91 98765 43210',
  summary: 'Full-stack engineer.',
  skills: ['React', 'TypeScript', 'Node.js', 'MongoDB'],
  experience: [
    { title: 'Full Stack Engineer', company: 'Acme', startDate: 'Jan 2019', endDate: 'Present', highlights: ['Built REST APIs with Express'] },
  ],
  education: [{ degree: 'B.Tech', field: 'Computer Science', institution: 'PU' }],
  jobTitles: ['Full Stack Engineer'],
  yearsOfExperience: 6,
});
const TEXT = 'Asha Rao Full Stack Engineer. React, TypeScript, Node.js, MongoDB. Built REST APIs with Express. '.repeat(15);

const jd = structuredJdSchema.parse({
  jobTitle: 'Senior Full Stack Engineer',
  requiredSkills: ['React', 'TypeScript', 'NodeJS', 'Docker', 'AWS'],
  preferredSkills: ['GraphQL'],
  technologies: ['MongoDB', 'Kubernetes'],
  keywords: ['REST APIs', 'microservices'],
  educationRequirements: ["Bachelor's degree in Computer Science"],
  minYearsExperience: 5,
});

describe('computeMatch', () => {
  const r = computeMatch(resume, TEXT, jd);

  it('matches skills (including aliases) and lists real gaps only', () => {
    expect(r.requiredSkills.matched).toEqual(['React', 'TypeScript', 'NodeJS']);
    expect(r.requiredSkills.missing).toEqual(['Docker', 'AWS']);
    expect(r.preferredSkills.missing).toEqual(['GraphQL']);
    expect(r.technologies).toEqual({ matched: ['MongoDB'], missing: ['Kubernetes'] });
    expect(r.keywords).toEqual({ matched: ['REST APIs'], missing: ['microservices'] });
  });

  it('rates experience, role and education from the data', () => {
    expect(r.experience).toMatchObject({ level: 'Strong', requiredYears: 5, resumeYears: 6 });
    expect(r.role.level).toBe('Strong');
    expect(r.education.level).toBe('Strong');
  });

  it('produces a bounded score with a breakdown, never claims hiring odds', () => {
    expect(r.score).toBeGreaterThan(40);
    expect(r.score).toBeLessThan(90);
    expect(JSON.stringify(r)).not.toMatch(/chance|probability|hired/i);
    expect(r.scoreBreakdown.reduce((s, b) => s + b.weight, 0)).toBeGreaterThanOrEqual(99);
  });

  it('gives suggestions that are conditional, not invented claims', () => {
    expect(r.gaps.join(' ')).toMatch(/Docker, AWS/);
    expect(r.suggestions.join(' ')).toMatch(/if you genuinely have/i);
  });

  it('does not match a term that only appears inside another word', () => {
    const j = structuredJdSchema.parse({ requiredSkills: ['Go', 'Java'] });
    const m = computeMatch(resume, 'I use javascript and mongodb daily '.repeat(30), j);
    expect(m.requiredSkills.matched).toEqual([]);
  });

  it('re-weights when the JD has little to compare, and handles an empty JD', () => {
    expect(computeMatch(resume, TEXT, structuredJdSchema.parse({ requiredSkills: ['React'] })).score).toBe(100);
    expect(computeMatch(resume, TEXT, structuredJdSchema.parse({})).score).toBe(0);
  });

  it('flags weak experience and unknown cases honestly', () => {
    const senior = structuredJdSchema.parse({ minYearsExperience: 12, requiredSkills: ['React'] });
    expect(computeMatch(resume, TEXT, senior).experience.level).toBe('Weak');
    const unknown = { ...resume, yearsOfExperience: null };
    expect(computeMatch(unknown, TEXT, senior).experience.level).toBe('Unknown');
  });

  it('scores ATS compatibility from the resume structure', () => {
    expect(r.ats.level).toBe('Good');
    const bare = structuredResumeSchema.parse({ name: 'X' });
    const ats = computeMatch(bare, 'tiny', jd).ats;
    expect(ats.level).toBe('Needs work');
    expect(ats.checks.some((c) => !c.ok && c.tip)).toBe(true);
  });
});
