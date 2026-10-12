import { MongoMemoryServer } from 'mongodb-memory-server';
import request from 'supertest';
import { extractResume } from '../src/ai/resumeExtractor';
import { createApp } from '../src/app';
import { connectDb, disconnectDb } from '../src/config/db';
import { ResumeModel } from '../src/models/resume.model';
import { UserModel } from '../src/models/user.model';
import { makeDocx, makePdf } from './helpers/files';

jest.mock('../src/ai/resumeExtractor', () => ({ extractResume: jest.fn() }));
const mockExtract = extractResume as jest.MockedFunction<typeof extractResume>;

const FIXTURE = {
  name: 'Asha Rao',
  email: 'asha@example.com',
  phone: '+91 98765 43210',
  summary: 'Backend Engineer with experience in Node.js and MongoDB.',
  skills: ['TypeScript', 'Node.js', 'MongoDB'],
  experience: [],
  education: [],
  projects: [],
  certifications: [],
  achievements: [],
  languages: [],
  jobTitles: ['Backend Engineer'],
  yearsOfExperience: null,
};

const app = createApp();
let mongo: MongoMemoryServer;

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

beforeAll(async () => {
  mongo = await MongoMemoryServer.create();
  await connectDb(mongo.getUri());
  await Promise.all([UserModel.init(), ResumeModel.init()]);
});
afterAll(async () => {
  await disconnectDb();
  await mongo.stop();
});
beforeEach(() => mockExtract.mockResolvedValue(FIXTURE));
afterEach(async () => {
  await Promise.all([UserModel.deleteMany({}), ResumeModel.deleteMany({})]);
  jest.clearAllMocks();
});

describe('POST /api/resumes/upload', () => {
  it('rejects unauthenticated uploads', async () => {
    const res = await request(app).post('/api/resumes/upload').attach('file', await makePdf(), 'cv.pdf');
    expect(res.status).toBe(401);
  });

  it('accepts a valid PDF, parses it and hides storage internals', async () => {
    const agent = await newUser('a@example.com');
    const up = await agent.post('/api/resumes/upload').attach('file', await makePdf(), 'My CV.pdf');
    expect(up.status).toBe(201);
    expect(up.body.resume).toMatchObject({ originalFileName: 'My CV.pdf', fileType: 'pdf', parsingStatus: 'UPLOADED' });

    const done = await waitForTerminal(agent, up.body.resume.id);
    expect(done.parsingStatus).toBe('COMPLETED');
    expect(done.structuredResumeData.name).toBe('Asha Rao');
    expect(JSON.stringify(done)).not.toMatch(/storageKey|extractedText/);

    // The text really was extracted from the PDF and passed to the AI step.
    expect(mockExtract.mock.calls[0][0]).toContain('asha@example.com');
    const stored = await ResumeModel.findById(up.body.resume.id).select('+extractedText +storageKey');
    expect(stored?.storageKey).toMatch(/^resumes\/[0-9a-f]{24}\/[0-9a-f-]{36}\.pdf$/);
  });

  it('accepts a valid DOCX', async () => {
    const agent = await newUser('a@example.com');
    const up = await agent.post('/api/resumes/upload').attach('file', await makeDocx(), 'cv.docx');
    expect(up.status).toBe(201);
    expect(up.body.resume.fileType).toBe('docx');
    const done = await waitForTerminal(agent, up.body.resume.id);
    expect(done.parsingStatus).toBe('COMPLETED');
    expect(mockExtract.mock.calls[0][0]).toContain('Backend Engineer');
  });

  it.each([
    ['an .exe file', async () => Buffer.from('MZ\x90\x00'), 'malware.exe'],
    ['an executable renamed to .pdf', async () => Buffer.from('MZ\x90\x00 not a pdf'), 'cv.pdf'],
    ['a text file renamed to .docx', async () => Buffer.from('hello world'), 'cv.docx'],
    ['a PDF with a .txt extension', () => makePdf(), 'cv.txt'],
  ])('rejects %s', async (_label, makeBuffer, name) => {
    const agent = await newUser('a@example.com');
    const res = await agent.post('/api/resumes/upload').attach('file', await makeBuffer(), name);
    expect(res.status).toBe(415);
    expect(await ResumeModel.countDocuments()).toBe(0);
  });

  it('rejects files over the size limit', async () => {
    const agent = await newUser('a@example.com');
    const big = Buffer.concat([Buffer.from('%PDF-1.4\n'), Buffer.alloc(1.2 * 1024 * 1024)]);
    const res = await agent.post('/api/resumes/upload').attach('file', big, 'big.pdf');
    expect(res.status).toBe(413);
  });

  it('rejects requests with no file', async () => {
    const agent = await newUser('a@example.com');
    const res = await agent.post('/api/resumes/upload').field('x', 'y');
    expect(res.status).toBe(400);
  });

  it('marks the resume FAILED with a safe message when the AI step fails', async () => {
    mockExtract.mockRejectedValue(new Error('secret upstream detail sk-123'));
    const agent = await newUser('a@example.com');
    const up = await agent.post('/api/resumes/upload').attach('file', await makePdf(), 'cv.pdf');
    const done = await waitForTerminal(agent, up.body.resume.id);
    expect(done.parsingStatus).toBe('FAILED');
    expect(done.parsingError).not.toMatch(/sk-123|upstream/);
  });

  it('marks the resume FAILED when the file has no readable text', async () => {
    const agent = await newUser('a@example.com');
    const up = await agent.post('/api/resumes/upload').attach('file', await makePdf(['hi']), 'empty.pdf');
    const done = await waitForTerminal(agent, up.body.resume.id);
    expect(done.parsingStatus).toBe('FAILED');
    expect(done.parsingError).toMatch(/No readable text/);
    expect(mockExtract).not.toHaveBeenCalled();
  });
});

describe('resume retrieval, deletion and user isolation', () => {
  it('lists and fetches own resumes, and deletes them', async () => {
    const agent = await newUser('a@example.com');
    const up = await agent.post('/api/resumes/upload').attach('file', await makePdf(), 'cv.pdf');
    const id = up.body.resume.id;
    expect((await waitForTerminal(agent, id)).parsingStatus).toBe('COMPLETED');

    const list = await agent.get('/api/resumes');
    expect(list.status).toBe(200);
    expect(list.body.resumes).toHaveLength(1);
    expect(list.body.resumes[0].id).toBe(id);

    expect((await agent.get(`/api/resumes/${id}`)).status).toBe(200);
    expect((await agent.delete(`/api/resumes/${id}`)).status).toBe(204);
    expect((await agent.get(`/api/resumes/${id}`)).status).toBe(404);
    expect((await agent.get('/api/resumes')).body.resumes).toHaveLength(0);
  });

  it('requires authentication for every endpoint', async () => {
    const id = '64b7f0f0f0f0f0f0f0f0f0f0';
    expect((await request(app).get('/api/resumes')).status).toBe(401);
    expect((await request(app).get(`/api/resumes/${id}`)).status).toBe(401);
    expect((await request(app).delete(`/api/resumes/${id}`)).status).toBe(401);
  });

  it("prevents users from seeing or deleting each other's resumes", async () => {
    const alice = await newUser('alice@example.com');
    const bob = await newUser('bob@example.com');
    const up = await alice.post('/api/resumes/upload').attach('file', await makePdf(), 'cv.pdf');
    const id = up.body.resume.id;
    expect((await waitForTerminal(alice, id)).parsingStatus).toBe('COMPLETED');

    expect((await bob.get(`/api/resumes/${id}`)).status).toBe(404);
    expect((await bob.delete(`/api/resumes/${id}`)).status).toBe(404);
    expect((await bob.get('/api/resumes')).body.resumes).toEqual([]);
    expect((await alice.get(`/api/resumes/${id}`)).status).toBe(200); // untouched
  });

  it('returns 404 for malformed ids', async () => {
    const agent = await newUser('a@example.com');
    expect((await agent.get('/api/resumes/not-an-id')).status).toBe(404);
  });
});
