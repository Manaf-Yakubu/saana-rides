import { authenticator } from 'otplib';
import { TotpService } from './totp.service';

const codeAt = (secret: string, epoch: number) => authenticator.clone({ epoch }).generate(secret);

describe('TotpService', () => {
  const svc = new TotpService({ MFA_ISSUER: 'SAANA RIDES' });
  const now = 1_790_000_000_000;

  it('builds an otpauth URI with issuer and label, using a 160-bit secret', () => {
    const secret = svc.generateSecret();
    expect(secret).toHaveLength(32);
    const uri = svc.uri(secret, 'admin@saana.test');
    expect(uri).toContain('otpauth://totp/');
    expect(uri).toContain('issuer=SAANA%20RIDES');
  });

  it('accepts current and adjacent-step codes, rejects others', () => {
    const secret = svc.generateSecret();
    const step = Math.floor(now / 30_000);
    expect(svc.check(secret, codeAt(secret, now), undefined, now)).toEqual({
      valid: true,
      timeStep: step,
    });
    expect(svc.check(secret, codeAt(secret, now - 30_000), undefined, now)).toEqual({
      valid: true,
      timeStep: step - 1,
    });
    expect(svc.check(secret, codeAt(secret, now + 90_000), undefined, now)).toEqual({
      valid: false,
    });
    expect(svc.check(secret, 'abcdef', undefined, now)).toEqual({ valid: false });
  });

  it('rejects a code from an already-used time step', () => {
    const secret = svc.generateSecret();
    const first = svc.check(secret, codeAt(secret, now), undefined, now);
    if (!first.valid) throw new Error('expected valid');
    expect(svc.check(secret, codeAt(secret, now), first.timeStep, now)).toEqual({ valid: false });
    expect(svc.check(secret, codeAt(secret, now + 30_000), first.timeStep, now).valid).toBe(true);
  });
});
