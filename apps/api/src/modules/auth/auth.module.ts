import { Module } from '@nestjs/common';
import { APP_GUARD } from '@nestjs/core';
import { JwtModule } from '@nestjs/jwt';
import type { AppConfig } from '../../config';
import { APP_CONFIG } from '../../infra/config/config.module';
import { AuthController } from './auth.controller';
import { AuthService } from './auth.service';
import { AuthGuard } from './guards/auth.guard';
import { PolicyGuard } from './guards/policy.guard';
import { OtpService } from './otp.service';
import { PasswordService } from './password.service';
import { TokenService } from './token.service';
import { TotpService } from './totp.service';

@Module({
  imports: [
    JwtModule.registerAsync({
      inject: [APP_CONFIG],
      useFactory: (config: AppConfig) => ({
        secret: config.JWT_ACCESS_SECRET,
        signOptions: { algorithm: 'HS256', issuer: 'saana-api' },
        verifyOptions: { algorithms: ['HS256'], issuer: 'saana-api' },
      }),
    }),
  ],
  controllers: [AuthController],
  providers: [
    AuthService,
    PasswordService,
    TotpService,
    OtpService,
    TokenService,
    // Order matters: authenticate first, then check policy. Every route is denied unless
    // it is @Public() or declares @Authorize(...).
    { provide: APP_GUARD, useClass: AuthGuard },
    { provide: APP_GUARD, useClass: PolicyGuard },
  ],
  exports: [PasswordService, TokenService],
})
export class AuthModule {}
