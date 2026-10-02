import { loadConfig } from './config';

describe('loadConfig', () => {
  it('parses a valid environment with defaults', () => {
    const cfg = loadConfig({ DATABASE_URL: 'postgresql://u:p@localhost:5432/db' });
    expect(cfg.API_PORT).toBe(4000);
    expect(cfg.CORS_ORIGINS).toEqual(['http://localhost:3000']);
  });

  it('splits CORS origins', () => {
    const cfg = loadConfig({
      DATABASE_URL: 'postgresql://u:p@localhost:5432/db',
      CORS_ORIGINS: 'https://a.com, https://b.com',
    });
    expect(cfg.CORS_ORIGINS).toEqual(['https://a.com', 'https://b.com']);
  });

  it('throws on missing DATABASE_URL', () => {
    expect(() => loadConfig({})).toThrow(/DATABASE_URL/);
  });
});
