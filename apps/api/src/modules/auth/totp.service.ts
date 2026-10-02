import { Inject, Injectable } from '@nestjs/common';
import { authenticator } from 'otplib';
import type { AppConfig } from '../../config';
import { APP_CONFIG } from '../../infra/config/config.module';

export type TotpCheck = { valid: false } | { valid: true; timeStep: number };

const STEP_SECONDS = 30;
const SECRET_BYTES = 20;

@Injectable()
export class TotpService {
  constructor(@Inject(APP_CONFIG) private readonly config: Pick<AppConfig, 'MFA_ISSUER'>) {}

  generateSecret(): string {
    return authenticator.generateSecret(SECRET_BYTES);
  }

  uri(secret: string, label: string): string {
    return authenticator.keyuri(label, this.config.MFA_ISSUER, secret);
  }

  /**
   * Accepts one step of clock drift either side and rejects codes whose time step is at or
   * before `afterTimeStep`, so a code cannot be replayed.
   */
  check(secret: string, code: string, afterTimeStep?: number, now: number = Date.now()): TotpCheck {
    const otp = authenticator.clone({ window: 1, step: STEP_SECONDS, epoch: now });
    const delta = otp.checkDelta(code, secret);
    if (delta === null) return { valid: false };
    const timeStep = Math.floor(now / 1000 / STEP_SECONDS) + delta;
    if (afterTimeStep !== undefined && timeStep <= afterTimeStep) return { valid: false };
    return { valid: true, timeStep };
  }
}
