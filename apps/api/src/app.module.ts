import { Module } from '@nestjs/common';
import { APP_GUARD } from '@nestjs/core';
import { ThrottlerGuard, ThrottlerModule } from '@nestjs/throttler';
import { LoggerModule } from 'nestjs-pino';
import type { AppConfig } from './config';
import { APP_CONFIG, ConfigModule } from './infra/config/config.module';
import { CryptoModule } from './infra/crypto/crypto.module';
import { PrismaModule } from './infra/prisma/prisma.module';
import { SmsModule } from './infra/sms/sms.module';
import { AuditModule } from './modules/audit/audit.module';
import { AuthModule } from './modules/auth/auth.module';
import { HealthModule } from './modules/health/health.module';

@Module({
  imports: [
    LoggerModule.forRoot({
      pinoHttp: {
        level: process.env.NODE_ENV === 'production' ? 'info' : 'debug',
        transport: process.env.NODE_ENV === 'development' ? { target: 'pino-pretty' } : undefined,
        redact: [
          'req.headers.authorization',
          'req.headers.cookie',
          'req.body.password',
          'req.body.otp',
          'req.body.code',
          'req.body.refreshToken',
          'req.body.mfaToken',
        ],
      },
    }),
    ConfigModule,
    ThrottlerModule.forRootAsync({
      inject: [APP_CONFIG],
      useFactory: (config: AppConfig) => [{ ttl: 60_000, limit: config.RATE_LIMIT_PER_MINUTE }],
    }),
    PrismaModule,
    CryptoModule,
    SmsModule,
    AuditModule,
    AuthModule,
    HealthModule,
  ],
  providers: [{ provide: APP_GUARD, useClass: ThrottlerGuard }],
})
export class AppModule {}
