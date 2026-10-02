import type { User } from '@prisma/client';
import request from 'supertest';
import { createTestApp, createUser, type TestApp } from './helpers';

describe('RBAC (integration)', () => {
  let t: TestApp;
  const tokens: Record<string, string> = {};
  const http = () => request(t.app.getHttpServer());
  const bearer = (who: string) => ({ Authorization: `Bearer ${tokens[who]}` });

  const signFor = (u: User) => t.tokens.signAccessToken(u);

  beforeAll(async () => {
    t = await createTestApp();
    const users = {
      management: await createUser(t, { role: 'MANAGEMENT' }),
      finance: await createUser(t, { role: 'STAFF', staffTypes: ['FINANCE'] }),
      fleet: await createUser(t, { role: 'STAFF', staffTypes: ['FLEET'] }),
      driver: await createUser(t, { role: 'DRIVER' }),
      disabled: await createUser(t, { role: 'MANAGEMENT' }),
    };
    for (const [k, u] of Object.entries(users)) tokens[k] = await signFor(u);
    await t.prisma.user.update({ where: { id: users.disabled.id }, data: { status: 'DISABLED' } });
  });

  afterAll(async () => {
    await t.app.close();
  });

  it('requires authentication on non-public routes', async () => {
    await http().get('/v1/test-rbac/management').expect(401);
    await http().get('/v1/test-rbac/management').set('Authorization', 'Bearer garbage').expect(401);
  });

  it('denies routes without a declared policy, even for management', async () => {
    await http().get('/v1/test-rbac/no-policy').set(bearer('management')).expect(403);
  });

  it.each([
    ['management', 'management', 200],
    ['finance', 'management', 403],
    ['driver', 'management', 403],
    ['management', 'finance', 200],
    ['finance', 'finance', 200],
    ['fleet', 'finance', 403],
    ['driver', 'finance', 403],
    ['driver', 'driver', 200],
    ['management', 'driver', 403],
  ])('%s -> /%s is %i', async (who, route, status) => {
    await http().get(`/v1/test-rbac/${route}`).set(bearer(who)).expect(status);
  });

  it('rejects tokens of disabled users', async () => {
    await http().get('/v1/test-rbac/management').set(bearer('disabled')).expect(401);
  });

  it('does not accept an MFA challenge token as an access token', async () => {
    const mgmt = await createUser(t, { role: 'MANAGEMENT' });
    const mfaToken = await t.tokens.signMfaToken(mgmt.id, 'verify');
    await http().get('/v1/auth/me').set('Authorization', `Bearer ${mfaToken}`).expect(401);
  });
});
