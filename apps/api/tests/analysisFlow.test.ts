import { MongoMemoryServer } from 'mongodb-memory-server';
import request from 'supertest';
import { extractJd } from '../src/ai/jdExtractor';
import { extractResume } from '../src/ai/resumeExtractor';
import { createApp } from '../src/app';
import { connectDb, disconnectDb } from '../src/config/db';
import { AnalysisModel } from '../src/models/analysis.model';
import { JobDescriptionModel } from '../src/models/jobDescription.model';
import { ResumeModel } from '../src/models/resume.model';
import { UserModel } from '../src/models/user.model';
import { AppError } from '../src/utils/AppError';
import { RESUME_LINES, makePdf } from './helpers/files';

jest.mock('../src/ai/resumeExtractor', () => ({ extractResume: jest.fn() }));
jest.mock('../src/ai/jdExtractor', () => ({ extractJd: jest.fn() }));
const mockResume = extractResume as jest.MockedFunction<typeof extractResume>;
const mockJd = extractJd as jest.MockedFunction<typeof extractJd>;

const RESUME = {
  name: 'Asha Rao', email: 'asha@example.com', phone: '+91 98765 43210',
  summary: 'Backend Engineer with experience in Node.js and MongoDB.',
  skills: ['TypeScript', 'Node.js', 'MongoDB'],
  experience: [{ title: 'Backend Engineer', company: 'Acme', location: null, startDate: '2019', endDate: 'Present', highlights: [] }],
  education: [], projects: [], certifications: [], achievements: [], languages: [],
  jobTitles: ['Backend Engineer'], yearsOfExperience: 6,
};
const JD = {
  jobTitle: 'Backend Engineer', company: 'Globex',
  requiredSkills: ['TypeScript', 'Node.js', 'Docker'], preferredSkills: [], technologies: ['MongoDB'],
  keywords: [], softSkills: [], responsibilities: ['Build APIs'], educationRequirements: [],
  otherRequirements: [], minYearsExperience: 3,
};
const JD_TEXT = 'We are hiring a Backend Engineer. Requirements: TypeScript, Node.js, Docker. 3+ years of experience.';

const app = createApp();
let mongo: MongoMemoryServer;

beforeAll(async () => {
  mongo = await MongoMemoryServer.create();
  await connectDb(mongo.getUri());
  await Promise.all([UserModel.init(), ResumeModel.init(), JobDescriptionModel.init(), AnalysisModel.init()]);
});
afterAll(async () => {
  await disconnectDb();
  await mongo.stop();
});
beforeEach(() => {
  mockResume.mockResolvedValue(RESUME);
  mockJd.mockResolvedValue(JD);
});
afterEach(async () => {
  await Promise.all([
    UserModel.deleteMany({}),
    ResumeModel.deleteMany({}),
    JobDescriptionModel.deleteMany({}),
    AnalysisModel.deleteMany({}),
  ]);
  jest.clearAllMocks();
});

async function newUser(email: string) {
  const agent = request.agent(app);
  await agent.post('/api/auth/register').send({ name: 'User', email, password: 'password123' });
  return agent;
}
async function waitForTerminal(agent: ReturnType<typeof request.agent>, id: string) {
  for (let i = 0; i < 50; i++) {
    const res = await agent.get(`/api/resumes/${id}`);
    if (['COMPLETED', 'FAILED'].includes(res.body.resume.parsingStatus)) return res.body.resume;
    await new Promise((r) => setTimeout(r, 100));
  }
  throw new Error('Resume never reached a terminal status');
}
async function readyResume(agent: ReturnType<typeof request.agent>) {
  const up = await agent.post('/api/resumes/upload').attach('file', await makePdf(RESUME_LINES), 'cv.pdf');
  const done = await waitForTerminal(agent, up.body.resume.id);
  return done as { id: string; parsingStatus: string };
}

describe('complete flow: upload -> resume ready -> JD -> analysis', () => {
  it('runs end to end and persists everything for the user', async () => {
    const agent = await newUser('a@example.com');
    const resume = await readyResume(agent);
    expect(resume.parsingStatus).toBe('COMPLETED');
    expect(mockJd).not.toHaveBeenCalled(); // no JD work during resume upload

    const saved = await ResumeModel.findById(resume.id).select('+extractedText');
    expect(saved?.userId).toBeDefined();
    expect(saved?.extractedText).toMatch(/Asha Rao/); // real extracted text is what the matcher uses

    const jd = await agent.post('/api/job-descriptions').send({ resumeId: resume.id, text: JD_TEXT });
    expect(jd.status).toBe(201);
    expect(jd.body.jobDescription).toMatchObject({ parsingStatus: 'COMPLETED', originalText: JD_TEXT, resumeId: resume.id });
    expect(mockJd).toHaveBeenCalledWith(JD_TEXT);
    expect((await agent.get(`/api/job-descriptions/${jd.body.jobDescription.id}`)).status).toBe(200);

    const an = await agent.post('/api/analyses/resume-jd').send({ jobDescriptionId: jd.body.jobDescription.id });
    expect(an.status).toBe(201);
    const a = an.body.analysis;
    expect(a).toMatchObject({ resumeFileName: 'cv.pdf', jobTitle: 'Backend Engineer', company: 'Globex' });
    expect(a.score).toBeGreaterThan(0);
    expect(a.result.requiredSkills.missing).toEqual(['Docker']);
    expect(a.result.requiredSkills.matched).toEqual(['TypeScript', 'Node.js']);
    expect(a.result.experience.level).toBe('Strong');

    const again = await agent.get(`/api/analyses/${a.id}`);
    expect(again.status).toBe(200);
    expect(again.body.analysis.score).toBe(a.score);
  });

  it('lists only the signed-in user analyses, newest first', async () => {
    const alice = await newUser('alice@example.com');
    const bob = await newUser('bob@example.com');
    const resume = await readyResume(alice);
    const ids: string[] = [];
    for (let i = 0; i < 2; i++) {
      const jd = await alice.post('/api/job-descriptions').send({ resumeId: resume.id, text: JD_TEXT });
      ids.push((await alice.post('/api/analyses/resume-jd').send({ jobDescriptionId: jd.body.jobDescription.id })).body.analysis.id);
    }
    const list = await alice.get('/api/analyses');
    expect(list.status).toBe(200);
    expect(list.body.analyses.map((a: { id: string }) => a.id)).toEqual([ids[1], ids[0]]);
    expect((await bob.get('/api/analyses')).body.analyses).toEqual([]);
    expect((await request(app).get('/api/analyses')).status).toBe(401);
  });

  it('deleting the resume also removes its job descriptions and analyses', async () => {
    const agent = await newUser('a@example.com');
    const resume = await readyResume(agent);
    const jd = await agent.post('/api/job-descriptions').send({ resumeId: resume.id, text: JD_TEXT });
    await agent.post('/api/analyses/resume-jd').send({ jobDescriptionId: jd.body.jobDescription.id });
    await agent.delete(`/api/resumes/${resume.id}`);
    expect(await JobDescriptionModel.countDocuments()).toBe(0);
    expect(await AnalysisModel.countDocuments()).toBe(0);
  });
});

describe('job description input and failures', () => {
  it('rejects empty and very short JDs without calling the AI', async () => {
    const agent = await newUser('a@example.com');
    const resume = await readyResume(agent);
    for (const text of ['', '   \n  ', 'Need a dev']) {
      const res = await agent.post('/api/job-descriptions').send({ resumeId: resume.id, text });
      expect(res.status).toBe(400);
    }
    expect((await agent.post('/api/job-descriptions').send({ resumeId: resume.id })).status).toBe(400);
    expect(mockJd).not.toHaveBeenCalled();
    expect(await JobDescriptionModel.countDocuments()).toBe(0);
  });

  it('saves the JD as FAILED with a safe message when AI parsing fails, and blocks analysis', async () => {
    mockJd.mockRejectedValue(new Error('secret upstream detail sk-123'));
    const agent = await newUser('a@example.com');
    const resume = await readyResume(agent);
    const res = await agent.post('/api/job-descriptions').send({ resumeId: resume.id, text: JD_TEXT });
    expect(res.status).toBe(201);
    expect(res.body.jobDescription.parsingStatus).toBe('FAILED');
    expect(res.body.jobDescription.parsingError).not.toMatch(/sk-123|upstream/);

    const an = await agent.post('/api/analyses/resume-jd').send({ jobDescriptionId: res.body.jobDescription.id });
    expect(an.status).toBe(409);
    expect(await AnalysisModel.countDocuments()).toBe(0);
  });

  it('shows user-friendly AppError messages from the AI layer', async () => {
    mockJd.mockRejectedValue(new AppError(503, 'The AI service is busy right now. Please try again in a minute.'));
    const agent = await newUser('a@example.com');
    const resume = await readyResume(agent);
    const res = await agent.post('/api/job-descriptions').send({ resumeId: resume.id, text: JD_TEXT });
    expect(res.body.jobDescription.parsingError).toMatch(/busy/);
  });
});

describe('resume must be ready before the JD step', () => {
  it('refuses a JD when resume parsing failed', async () => {
    mockResume.mockRejectedValue(new Error('boom'));
    const agent = await newUser('a@example.com');
    const resume = await readyResume(agent);
    expect(resume.parsingStatus).toBe('FAILED');
    const res = await agent.post('/api/job-descriptions').send({ resumeId: resume.id, text: JD_TEXT });
    expect(res.status).toBe(409);
    expect(await JobDescriptionModel.countDocuments()).toBe(0);
  });

  it('refuses an invalid resume id', async () => {
    const agent = await newUser('a@example.com');
    expect((await agent.post('/api/job-descriptions').send({ resumeId: 'nope', text: JD_TEXT })).status).toBe(404);
  });
});

describe('authentication and user isolation', () => {
  it('requires login for every new endpoint', async () => {
    expect((await request(app).post('/api/job-descriptions').send({})).status).toBe(401);
    expect((await request(app).get('/api/job-descriptions/abc')).status).toBe(401);
    expect((await request(app).post('/api/analyses/resume-jd').send({})).status).toBe(401);
    expect((await request(app).get('/api/analyses/abc')).status).toBe(401);
  });

  it("does not let another user use or read someone's resume, JD or analysis", async () => {
    const alice = await newUser('alice@example.com');
    const bob = await newUser('bob@example.com');
    const resume = await readyResume(alice);
    const jd = await alice.post('/api/job-descriptions').send({ resumeId: resume.id, text: JD_TEXT });
    const jdId = jd.body.jobDescription.id;
    const an = await alice.post('/api/analyses/resume-jd').send({ jobDescriptionId: jdId });

    expect((await bob.post('/api/job-descriptions').send({ resumeId: resume.id, text: JD_TEXT })).status).toBe(404);
    expect((await bob.get(`/api/job-descriptions/${jdId}`)).status).toBe(404);
    expect((await bob.post('/api/analyses/resume-jd').send({ jobDescriptionId: jdId })).status).toBe(404);
    expect((await bob.get(`/api/analyses/${an.body.analysis.id}`)).status).toBe(404);
    expect((await alice.get(`/api/analyses/${an.body.analysis.id}`)).status).toBe(200);
  });
});
