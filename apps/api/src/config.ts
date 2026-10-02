import { z } from 'zod';

const INSECURE_MARKERS = ['change-me', 'dev-only'];

const envSchema = z
  .object({
    NODE_ENV: z.enum(['development', 'test', 'production']).default('development'),
    API_PORT: z.coerce.number().int().positive().default(4000),
    DATABASE_URL: z.string().url(),
    CORS_ORIGINS: z
      .string()
      .default('http://localhost:3000')
      .transform((v) =>
        v
          .split(',')
          .map((s) => s.trim())
          .filter(Boolean),
      ),
    JWT_ACCESS_SECRET: z.string().min(32),
    JWT_ACCESS_TTL_SECONDS: z.coerce.number().int().positive().default(900),
    REFRESH_TOKEN_TTL_DAYS: z.coerce.number().int().positive().default(30),
    FIELD_ENCRYPTION_KEY: z
      .string()
      .refine((v) => Buffer.from(v, 'base64').length === 32, 'must be 32 bytes, base64-encoded'),
    RATE_LIMIT_PER_MINUTE: z.coerce.number().int().positive().default(120),
    MFA_ISSUER: z.string().default('SAANA RIDES'),
  })
  .superRefine((cfg, ctx) => {
    if (cfg.NODE_ENV !== 'production') return;
    for (const key of ['JWT_ACCESS_SECRET', 'FIELD_ENCRYPTION_KEY'] as const) {
      const bytes = key === 'FIELD_ENCRYPTION_KEY' ? Buffer.from(cfg[key], 'base64') : null;
      const raw = bytes ? bytes.toString() : cfg[key];
      const uniform = !!bytes && bytes.every((b) => b === bytes[0]);
      if (uniform || INSECURE_MARKERS.some((m) => raw.includes(m))) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          path: [key],
          message: 'placeholder value in production',
        });
      }
    }
  });

export type AppConfig = z.infer<typeof envSchema>;

export function loadConfig(env: NodeJS.ProcessEnv = process.env): AppConfig {
  const parsed = envSchema.safeParse(env);
  if (!parsed.success) {
    const issues = parsed.error.issues.map((i) => `${i.path.join('.')}: ${i.message}`).join('; ');
    throw new Error(`Invalid environment configuration: ${issues}`);
  }
  return parsed.data;
}
