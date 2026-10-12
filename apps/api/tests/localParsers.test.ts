import { parseJdLocally } from '../src/parsing/localJdParser';
import { parseResumeLocally, yearsFromRanges } from '../src/parsing/localResumeParser';
import { computeMatch } from '../src/services/resumeMatch.service';

const RESUME = `Asha Rao
Pune, India | asha.rao@example.com | +91 98765 43210 | linkedin.com/in/asharao

PROFESSIONAL SUMMARY
Full-stack engineer building web applications and REST APIs.

SKILLS
Languages: JavaScript, TypeScript, Python
Frameworks: React, Node.js, Express
Databases: MongoDB, PostgreSQL | Tools: Docker, Git

WORK EXPERIENCE
Senior Software Engineer, Acme Corp                        Jan 2021 - Present
• Built REST APIs serving 1M requests per day using Node.js and MongoDB
• Led a team of 4 engineers and reduced deploy time by 40%
Software Engineer | Globex Pvt Ltd | Pune
Jun 2018 - Dec 2020
- Developed React dashboards for internal analytics
- Wrote unit tests with Jest

EDUCATION
B.Tech in Computer Science, Pune University, 2014 - 2018
CGPA: 8.4/10

PROJECTS
CareerPrep AI - Interview practice platform
• Resume parsing and job matching
Technologies: Next.js, Express, MongoDB

CERTIFICATIONS
AWS Certified Developer - Amazon, 2022

ACHIEVEMENTS
• Employee of the year 2022

LANGUAGES
English (Fluent), Hindi, Marathi`;

const JD = `Senior Backend Engineer at Globex
About us
Globex builds logistics software.

Responsibilities
- Design and build scalable REST APIs
- Mentor junior engineers and perform code reviews

Requirements
- 5+ years of experience in backend development
- Strong skills in Node.js, TypeScript and MongoDB
- Experience with Docker and AWS
- Bachelor's degree in Computer Science or related field
- Excellent communication skills

Nice to have
- Kubernetes
- GraphQL experience`;

describe('parseResumeLocally', () => {
  const r = parseResumeLocally(RESUME);

  it('extracts contact details and summary from the text', () => {
    expect(r).toMatchObject({
      name: 'Asha Rao',
      email: 'asha.rao@example.com',
      phone: '+91 98765 43210',
      summary: 'Full-stack engineer building web applications and REST APIs.',
    });
  });

  it('extracts skills without category labels', () => {
    expect(r.skills).toEqual(['JavaScript', 'TypeScript', 'Python', 'React', 'Node.js', 'Express', 'MongoDB', 'PostgreSQL', 'Docker', 'Git']);
  });

  it('extracts experience entries with dates and bullet points', () => {
    expect(r.experience).toHaveLength(2);
    expect(r.experience[0]).toMatchObject({ title: 'Senior Software Engineer', company: 'Acme Corp', startDate: 'Jan 2021', endDate: 'Present' });
    expect(r.experience[0].highlights).toHaveLength(2);
    expect(r.experience[1]).toMatchObject({ title: 'Software Engineer', company: 'Globex Pvt Ltd', startDate: 'Jun 2018', endDate: 'Dec 2020' });
    expect(r.jobTitles).toEqual(['Senior Software Engineer', 'Software Engineer']);
  });

  it('extracts education, projects, certifications, achievements and languages', () => {
    expect(r.education[0]).toMatchObject({ degree: 'B.Tech', field: 'Computer Science', institution: 'Pune University', startDate: '2014', endDate: '2018' });
    expect(r.education[0].grade).toMatch(/8\.4/);
    expect(r.projects[0]).toMatchObject({ name: 'CareerPrep AI', technologies: ['Next.js', 'Express', 'MongoDB'] });
    expect(r.certifications[0]).toEqual({ name: 'AWS Certified Developer', issuer: 'Amazon', date: '2022' });
    expect(r.achievements).toEqual(['Employee of the year 2022']);
    expect(r.languages).toEqual(['English', 'Hindi', 'Marathi']);
  });

  it('computes years of experience only from the written dates', () => {
    expect(yearsFromRanges([{ start: 'Jan 2020', end: 'Dec 2021' }])).toBe(2);
    // overlapping periods count once
    expect(yearsFromRanges([{ start: '2018', end: '2020' }, { start: '2019', end: '2021' }])).toBe(4);
    expect(r.yearsOfExperience).toBeGreaterThan(5);
  });

  it('never invents data: missing sections stay empty', () => {
    const bare = parseResumeLocally('Some Person\nperson@example.com\n\nI like hiking and reading books about history.');
    expect(bare).toMatchObject({ name: 'Some Person', email: 'person@example.com', summary: null, yearsOfExperience: null });
    expect(bare.experience).toEqual([]);
    expect(bare.education).toEqual([]);
    expect(bare.projects).toEqual([]);
    expect(bare.certifications).toEqual([]);
    expect(bare.skills).toEqual([]);
  });

  it('falls back to known technologies that literally appear when there is no Skills section', () => {
    const out = parseResumeLocally('Dev Person\ndev@example.com\n\nEXPERIENCE\nEngineer at Foo Jan 2020 - Dec 2021\n- Built services in Python with Docker and Redis');
    expect(out.skills).toEqual(expect.arrayContaining(['Python', 'Docker', 'Redis']));
    expect(out.skills).not.toContain('Kubernetes');
  });

  it('does not mistake ordinary words for technologies', () => {
    const out = parseResumeLocally('Dev Person\n\nEXPERIENCE\nEngineer Jan 2020 - Dec 2021\n- I express ideas clearly and excel at spring planning');
    expect(out.skills).toEqual([]);
  });
});

describe('parseJdLocally', () => {
  const jd = parseJdLocally(JD);

  it('extracts title, company, experience and education requirements', () => {
    expect(jd).toMatchObject({ jobTitle: 'Senior Backend Engineer', company: 'Globex', minYearsExperience: 5 });
    expect(jd.educationRequirements).toEqual(["Bachelor's degree in Computer Science or related field"]);
  });

  it('separates required from preferred skills', () => {
    expect(jd.requiredSkills).toEqual(expect.arrayContaining(['Node.js', 'TypeScript', 'MongoDB', 'Docker', 'AWS']));
    expect(jd.requiredSkills).not.toContain('Kubernetes');
    expect(jd.preferredSkills.sort()).toEqual(['GraphQL', 'Kubernetes']);
  });

  it('extracts responsibilities, soft skills and keywords from the text', () => {
    expect(jd.responsibilities).toEqual(['Design and build scalable REST APIs', 'Mentor junior engineers and perform code reviews']);
    expect(jd.softSkills).toEqual(['communication']);
    expect(jd.keywords).toContain('REST APIs');
    expect(jd.technologies).not.toContain('REST'); // folded into "REST APIs"
  });

  it('returns empty results for text with nothing recognisable', () => {
    const out = parseJdLocally('We are a friendly company. Come and join our team of wonderful people soon.');
    expect(out.requiredSkills).toEqual([]);
    expect(out.minYearsExperience).toBeNull();
  });
});

describe('local parsers feed the matcher end to end', () => {
  it('produces a sensible Resume-JD score with real gaps', () => {
    const result = computeMatch(parseResumeLocally(RESUME), RESUME, parseJdLocally(JD));
    expect(result.requiredSkills.matched).toEqual(expect.arrayContaining(['Node.js', 'TypeScript', 'MongoDB', 'Docker']));
    expect(result.requiredSkills.missing).toEqual([]); // AWS is mentioned in the resume's certification
    expect(result.preferredSkills.missing).toEqual(expect.arrayContaining(['GraphQL', 'Kubernetes']));
    expect(result.experience.level).toBe('Strong');
    expect(result.education.level).toBe('Strong');
    expect(result.score).toBeGreaterThan(50);
    expect(result.score).toBeLessThanOrEqual(100);
  });
});
