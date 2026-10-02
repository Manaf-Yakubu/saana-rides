import { FieldEncryptionService } from './field-encryption.service';

const svc = new FieldEncryptionService({
  FIELD_ENCRYPTION_KEY: Buffer.alloc(32, 7).toString('base64'),
});

describe('FieldEncryptionService', () => {
  it('round-trips and uses a fresh IV each time', () => {
    const a = svc.encrypt('GHA-123456789-0');
    const b = svc.encrypt('GHA-123456789-0');
    expect(a).not.toEqual(b);
    expect(a.startsWith('v1.')).toBe(true);
    expect(svc.decrypt(a)).toBe('GHA-123456789-0');
  });

  it('rejects tampered ciphertext', () => {
    const parts = svc.encrypt('secret').split('.');
    parts[3] = Buffer.from('tampered').toString('base64url');
    expect(() => svc.decrypt(parts.join('.'))).toThrow();
  });

  it('rejects ciphertext from another key', () => {
    const other = new FieldEncryptionService({
      FIELD_ENCRYPTION_KEY: Buffer.alloc(32, 8).toString('base64'),
    });
    expect(() => other.decrypt(svc.encrypt('secret'))).toThrow();
  });

  it('rejects unknown formats', () => {
    expect(() => svc.decrypt('v0.a.b.c')).toThrow(/Unsupported/);
  });
});
