import type { INestApplication } from '@nestjs/common';
import helmet from 'helmet';
import type { AppConfig } from './config';

export function configureApp(app: INestApplication, config: Pick<AppConfig, 'CORS_ORIGINS'>): void {
  app.use(helmet());
  app.enableCors({ origin: config.CORS_ORIGINS, credentials: true });
  app.setGlobalPrefix('v1', { exclude: ['health'] });
}
