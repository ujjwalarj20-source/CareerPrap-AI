import { MongoMemoryServer } from 'mongodb-memory-server';
import request from 'supertest';
import { createApp } from '../src/app';
import { connectDb, disconnectDb } from '../src/config/db';
import { UserModel } from '../src/models/user.model';

const app = createApp();
let mongo: MongoMemoryServer;

const creds = { name: 'Asha', email: 'Asha@Example.com', password: 'password123' };

beforeAll(async () => {
  mongo = await MongoMemoryServer.create();
  await connectDb(mongo.getUri());
  await UserModel.init();
});
afterAll(async () => {
  await disconnectDb();
  await mongo.stop();
});
afterEach(() => UserModel.deleteMany({}));

describe('auth', () => {
  it('registers, sets an HTTP-only cookie and never returns the hash', async () => {
    const res = await request(app).post('/api/auth/register').send(creds);
    expect(res.status).toBe(201);
    expect(res.body.user.email).toBe('asha@example.com');
    expect(JSON.stringify(res.body)).not.toMatch(/passwordHash|password123/);
    expect(res.headers['set-cookie'][0]).toMatch(/cp_token=.*HttpOnly/);
  });

  it('rejects invalid input and duplicate emails', async () => {
    const bad = await request(app).post('/api/auth/register').send({ ...creds, password: 'short' });
    expect(bad.status).toBe(400);
    await request(app).post('/api/auth/register').send(creds);
    const dup = await request(app).post('/api/auth/register').send(creds);
    expect(dup.status).toBe(409);
  });

  it('logs in with correct credentials and rejects wrong ones', async () => {
    await request(app).post('/api/auth/register').send(creds);
    const ok = await request(app).post('/api/auth/login').send({ email: creds.email, password: creds.password });
    expect(ok.status).toBe(200);
    const bad = await request(app).post('/api/auth/login').send({ email: creds.email, password: 'wrongpass1' });
    expect(bad.status).toBe(401);
    const unknown = await request(app).post('/api/auth/login').send({ email: 'x@y.com', password: 'whatever1' });
    expect(unknown.status).toBe(401);
  });

  it('protects /me and returns the user with a valid cookie', async () => {
    expect((await request(app).get('/api/auth/me')).status).toBe(401);
    const agent = request.agent(app);
    await agent.post('/api/auth/register').send(creds);
    const me = await agent.get('/api/auth/me');
    expect(me.status).toBe(200);
    expect(me.body.user.name).toBe('Asha');
  });

  it('logout clears the session', async () => {
    const agent = request.agent(app);
    await agent.post('/api/auth/register').send(creds);
    expect((await agent.post('/api/auth/logout')).status).toBe(204);
    expect((await agent.get('/api/auth/me')).status).toBe(401);
  });

  it('rejects a tampered token on a protected route', async () => {
    const res = await request(app).get('/api/auth/me').set('Cookie', 'cp_token=not.a.real.jwt');
    expect(res.status).toBe(401);
  });

  it('returns 400 for malformed JSON and stores targetRole', async () => {
    const bad = await request(app)
      .post('/api/auth/register')
      .set('Content-Type', 'application/json')
      .send('{"name":');
    expect(bad.status).toBe(400);
    const ok = await request(app)
      .post('/api/auth/register')
      .send({ ...creds, targetRole: 'Backend Engineer' });
    expect(ok.body.user.targetRole).toBe('Backend Engineer');
  });

  it('exposes a health endpoint', async () => {
    const res = await request(app).get('/api/health');
    expect(res.body.status).toBe('ok');
  });
});
