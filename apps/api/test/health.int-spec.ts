import request from 'supertest';
import { createTestApp, type TestApp } from './helpers';

describe('GET /health (integration)', () => {
  let t: TestApp;

  beforeAll(async () => {
    t = await createTestApp();
  });

  afterAll(async () => {
    await t.app.close();
  });

  it('returns ok with a live database, without auth', async () => {
    await request(t.app.getHttpServer()).get('/health').expect(200, { status: 'ok', db: 'up' });
  });
});
