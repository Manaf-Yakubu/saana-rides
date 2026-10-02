import { authenticator } from 'otplib';
import request from 'supertest';
import { FieldEncryptionService } from '../src/infra/crypto/field-encryption.service';
import { createTestApp, createUser, type TestApp } from './helpers';

const PASSWORD = 'correct-horse-battery-staple';
const codeAt = (secret: string, offsetMs = 0) =>
  authenticator.clone({ epoch: Date.now() + offsetMs }).generate(secret);

describe('auth (integration)', () => {
  let t: TestApp;
  const http = () => request(t.app.getHttpServer());

  beforeAll(async () => {
    t = await createTestApp();
  });

  afterAll(async () => {
    await t.app.close();
  });

  describe('management password + mandatory TOTP', () => {
    it('enrols TOTP on first login, then requires it, and blocks code replay', async () => {
      const email = `admin-${Date.now()}@saana.test`;
      const user = await createUser(t, { role: 'MANAGEMENT', password: PASSWORD, email });

      const first = await http()
        .post('/v1/auth/login')
        .send({ identifier: email.toUpperCase(), password: PASSWORD })
        .expect(200);
      expect(first.body.status).toBe('MFA_ENROLLMENT_REQUIRED');
      expect(first.body).not.toHaveProperty('accessToken');

      const enrol = await http()
        .post('/v1/auth/mfa/enroll')
        .send({ mfaToken: first.body.mfaToken })
        .expect(200);
      const secret: string = enrol.body.secret;
      expect(enrol.body.otpauthUri).toContain('otpauth://totp/');

      const stored = await t.prisma.user.findUniqueOrThrow({ where: { id: user.id } });
      expect(stored.mfaSecret).not.toContain(secret);
      expect(t.app.get(FieldEncryptionService).decrypt(stored.mfaSecret!)).toBe(secret);

      const code = codeAt(secret);
      const session = await http()
        .post('/v1/auth/mfa/verify')
        .send({ mfaToken: first.body.mfaToken, code })
        .expect(200);
      expect(session.body.user).toMatchObject({ id: user.id, role: 'MANAGEMENT' });

      await http()
        .get('/v1/auth/me')
        .set('Authorization', `Bearer ${session.body.accessToken}`)
        .expect(200)
        .expect((res) => expect(res.body.id).toBe(user.id));

      const second = await http()
        .post('/v1/auth/login')
        .send({ identifier: email, password: PASSWORD })
        .expect(200);
      expect(second.body.status).toBe('MFA_REQUIRED');
      // An enrolment token is not issued once MFA is on.
      await http().post('/v1/auth/mfa/enroll').send({ mfaToken: second.body.mfaToken }).expect(401);
      // Same code again is a replay.
      await http()
        .post('/v1/auth/mfa/verify')
        .send({ mfaToken: second.body.mfaToken, code })
        .expect(401);
      await http()
        .post('/v1/auth/mfa/verify')
        .send({ mfaToken: second.body.mfaToken, code: codeAt(secret, 30_000) })
        .expect(200);

      const actions = (
        await t.prisma.auditLog.findMany({
          where: { entityId: user.id },
          orderBy: { createdAt: 'asc' },
        })
      ).map((a) => a.action);
      expect(actions).toEqual(
        expect.arrayContaining(['auth.mfa_enrolled', 'auth.login_succeeded', 'auth.login_failed']),
      );
    });

    it('rejects unknown users and wrong passwords with the same error', async () => {
      const user = await createUser(t, {
        role: 'STAFF',
        staffTypes: ['FINANCE'],
        password: PASSWORD,
      });
      const unknown = await http()
        .post('/v1/auth/login')
        .send({ identifier: 'nobody@saana.test', password: PASSWORD })
        .expect(401);
      const wrong = await http()
        .post('/v1/auth/login')
        .send({ identifier: user.phone, password: 'wrong-password' })
        .expect(401);
      expect(unknown.body.message).toBe(wrong.body.message);
    });

    it('locks the account after five failures, even for the right password', async () => {
      const user = await createUser(t, {
        role: 'STAFF',
        staffTypes: ['FLEET'],
        password: PASSWORD,
      });
      for (let i = 0; i < 5; i++) {
        await http()
          .post('/v1/auth/login')
          .send({ identifier: user.phone, password: 'nope' })
          .expect(401);
      }
      await http()
        .post('/v1/auth/login')
        .send({ identifier: user.phone, password: PASSWORD })
        .expect(401);
      const locked = await t.prisma.user.findUniqueOrThrow({ where: { id: user.id } });
      expect(locked.lockedUntil!.getTime()).toBeGreaterThan(Date.now());
    });

    it('does not allow drivers to use password login', async () => {
      const driver = await createUser(t, { role: 'DRIVER', password: PASSWORD });
      await http()
        .post('/v1/auth/login')
        .send({ identifier: driver.phone, password: PASSWORD })
        .expect(401);
    });

    it('rejects unknown body fields', async () => {
      await http()
        .post('/v1/auth/login')
        .send({ identifier: 'a@b.com', password: 'x', role: 'MANAGEMENT' })
        .expect(400);
    });
  });

  describe('driver phone OTP', () => {
    it('logs in with a single-use code and normalises local phone formats', async () => {
      const driver = await createUser(t, { role: 'DRIVER' });
      const local = `0${driver.phone.slice(4)}`;

      await http().post('/v1/auth/otp/request').send({ phone: local }).expect(202);
      const code = t.sms.lastCodeFor(driver.phone)!;
      expect(code).toMatch(/^\d{6}$/);

      const wrong = code === '000000' ? '111111' : '000000';
      await http().post('/v1/auth/otp/verify').send({ phone: local, code: wrong }).expect(401);
      const session = await http()
        .post('/v1/auth/otp/verify')
        .send({ phone: local, code })
        .expect(200);
      expect(session.body.user).toMatchObject({ id: driver.id, role: 'DRIVER' });
      await http().post('/v1/auth/otp/verify').send({ phone: local, code }).expect(401);
    });

    it('accepts requests for unknown phones without sending anything', async () => {
      const before = t.sms.sent.length;
      await http().post('/v1/auth/otp/request').send({ phone: '0209999999' }).expect(202);
      expect(t.sms.sent.length).toBe(before);
    });

    it('limits sends per phone and burns a code after five wrong attempts', async () => {
      const driver = await createUser(t, { role: 'DRIVER' });
      for (let i = 0; i < 4; i++) {
        await http().post('/v1/auth/otp/request').send({ phone: driver.phone }).expect(202);
      }
      expect(t.sms.sent.filter((m) => m.to === driver.phone)).toHaveLength(3);

      const code = t.sms.lastCodeFor(driver.phone)!;
      const wrong = code === '000000' ? '111111' : '000000';
      for (let i = 0; i < 5; i++) {
        await http()
          .post('/v1/auth/otp/verify')
          .send({ phone: driver.phone, code: wrong })
          .expect(401);
      }
      await http().post('/v1/auth/otp/verify').send({ phone: driver.phone, code }).expect(401);
    });
  });

  describe('refresh tokens', () => {
    async function driverSession() {
      const driver = await createUser(t, { role: 'DRIVER' });
      await http().post('/v1/auth/otp/request').send({ phone: driver.phone }).expect(202);
      const res = await http()
        .post('/v1/auth/otp/verify')
        .send({ phone: driver.phone, code: t.sms.lastCodeFor(driver.phone) })
        .expect(200);
      return { driver, refreshToken: res.body.refreshToken as string };
    }

    it('rotates, and revokes the whole family when a rotated token is reused', async () => {
      const { driver, refreshToken: r1 } = await driverSession();
      const r2 = (await http().post('/v1/auth/refresh').send({ refreshToken: r1 }).expect(200)).body
        .refreshToken as string;
      expect(r2).not.toBe(r1);

      await http().post('/v1/auth/refresh').send({ refreshToken: r1 }).expect(401);
      await http().post('/v1/auth/refresh').send({ refreshToken: r2 }).expect(401);

      const reuse = await t.prisma.auditLog.findFirst({
        where: { actorId: driver.id, action: 'auth.refresh_reuse_detected' },
      });
      expect(reuse).not.toBeNull();
    });

    it('lets only one of two concurrent rotations succeed', async () => {
      const { refreshToken } = await driverSession();
      const results = await Promise.all([
        http().post('/v1/auth/refresh').send({ refreshToken }),
        http().post('/v1/auth/refresh').send({ refreshToken }),
      ]);
      expect(results.map((r) => r.status).sort()).toEqual([200, 401]);
    });

    it('revokes the session on logout and rejects tampered tokens', async () => {
      const { refreshToken } = await driverSession();
      const [id] = refreshToken.split('.');
      await http()
        .post('/v1/auth/refresh')
        .send({ refreshToken: `${id}.forged` })
        .expect(401);
      await http().post('/v1/auth/logout').send({ refreshToken }).expect(204);
      await http().post('/v1/auth/refresh').send({ refreshToken }).expect(401);
    });
  });

  describe('audit log', () => {
    it('is insert-only at the database level', async () => {
      const row = await t.prisma.auditLog.create({
        data: { actorId: null, action: 'test.event', entity: 'test' },
      });
      await expect(
        t.prisma.auditLog.update({ where: { id: row.id }, data: { action: 'tampered' } }),
      ).rejects.toThrow(/append-only/);
      await expect(t.prisma.auditLog.delete({ where: { id: row.id } })).rejects.toThrow(
        /append-only/,
      );
      await expect(t.prisma.$executeRawUnsafe('TRUNCATE audit_logs')).rejects.toThrow(
        /append-only/,
      );
    });
  });
});
