import { execSync } from 'node:child_process';
import { PostgreSqlContainer, StartedPostgreSqlContainer } from '@testcontainers/postgresql';

declare global {
  // eslint-disable-next-line no-var
  var __PG_CONTAINER__: StartedPostgreSqlContainer | undefined;
}

export default async function globalSetup(): Promise<void> {
  const container = await new PostgreSqlContainer('postgis/postgis:16-3.4').start();
  globalThis.__PG_CONTAINER__ = container;
  const url = `${container.getConnectionUri()}?schema=public`;
  process.env.DATABASE_URL = url;
  process.env.NODE_ENV = 'test';
  execSync('pnpm prisma migrate deploy', {
    env: { ...process.env, DATABASE_URL: url },
    stdio: 'inherit',
  });
}
