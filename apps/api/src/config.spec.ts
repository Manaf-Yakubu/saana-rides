import { loadConfig } from './config';

const base = {
  DATABASE_URL: 'postgresql://u:p@localhost:5432/db',
  JWT_ACCESS_SECRET: 'a'.repeat(32),
  FIELD_ENCRYPTION_KEY: Buffer.alloc(32, 1).toString('base64'),
};

describe('loadConfig', () => {
  it('parses a valid environment with defaults', () => {
    const cfg = loadConfig(base);
    expect(cfg.API_PORT).toBe(4000);
    expect(cfg.CORS_ORIGINS).toEqual(['http://localhost:3000']);
    expect(cfg.JWT_ACCESS_TTL_SECONDS).toBe(900);
  });

  it('splits CORS origins', () => {
    const cfg = loadConfig({ ...base, CORS_ORIGINS: 'https://a.com, https://b.com' });
    expect(cfg.CORS_ORIGINS).toEqual(['https://a.com', 'https://b.com']);
  });

  it('throws on missing DATABASE_URL', () => {
    expect(() => loadConfig({ ...base, DATABASE_URL: undefined })).toThrow(/DATABASE_URL/);
  });

  it('rejects encryption keys that are not 32 bytes', () => {
    expect(() => loadConfig({ ...base, FIELD_ENCRYPTION_KEY: 'c2hvcnQ=' })).toThrow(
      /FIELD_ENCRYPTION_KEY/,
    );
  });

  it('rejects placeholder secrets in production only', () => {
    const dev = { ...base, JWT_ACCESS_SECRET: 'dev-only-access-secret-change-me-000000' };
    expect(() => loadConfig(dev)).not.toThrow();
    expect(() => loadConfig({ ...dev, NODE_ENV: 'production' })).toThrow(/JWT_ACCESS_SECRET/);
  });

  it('rejects the all-zero development encryption key in production', () => {
    const prod = {
      ...base,
      NODE_ENV: 'production',
      JWT_ACCESS_SECRET: 'x'.repeat(48),
      FIELD_ENCRYPTION_KEY: Buffer.alloc(32, 0).toString('base64'),
    };
    expect(() => loadConfig(prod)).toThrow(/FIELD_ENCRYPTION_KEY/);
    const key = Buffer.from(Array.from({ length: 32 }, (_, i) => i)).toString('base64');
    expect(() => loadConfig({ ...prod, FIELD_ENCRYPTION_KEY: key })).not.toThrow();
  });
});
