import { PasswordService } from './password.service';

describe('PasswordService', () => {
  const svc = new PasswordService();

  it('hashes with argon2id and verifies', async () => {
    const hash = await svc.hash('correct horse battery');
    expect(hash.startsWith('$argon2id$')).toBe(true);
    await expect(svc.verify(hash, 'correct horse battery')).resolves.toBe(true);
    await expect(svc.verify(hash, 'wrong')).resolves.toBe(false);
  });

  it('returns false for malformed hashes and dummy checks', async () => {
    await expect(svc.verify('not-a-hash', 'x')).resolves.toBe(false);
    await expect(svc.verifyDummy('x')).resolves.toBe(false);
  });
});
