import { Inject, Injectable } from '@nestjs/common';
import { createHmac, randomInt, timingSafeEqual } from 'node:crypto';
import type { AppConfig } from '../../config';
import { APP_CONFIG } from '../../infra/config/config.module';
import { PrismaService } from '../../infra/prisma/prisma.service';
import { SMS_PROVIDER, type SmsProvider } from '../../infra/sms/sms.provider';

export const OTP_TTL_MS = 5 * 60_000;
export const OTP_MAX_ATTEMPTS = 5;
export const OTP_MAX_SENDS_PER_WINDOW = 3;
export const OTP_SEND_WINDOW_MS = 15 * 60_000;

@Injectable()
export class OtpService {
  constructor(
    private readonly prisma: PrismaService,
    @Inject(SMS_PROVIDER) private readonly sms: SmsProvider,
    @Inject(APP_CONFIG) private readonly config: Pick<AppConfig, 'JWT_ACCESS_SECRET'>,
  ) {}

  /** Sends a login code unless the phone has hit the send limit. Returns whether one was sent. */
  async send(phone: string): Promise<boolean> {
    const recent = await this.prisma.otpCode.count({
      where: {
        phone,
        purpose: 'LOGIN',
        createdAt: { gt: new Date(Date.now() - OTP_SEND_WINDOW_MS) },
      },
    });
    if (recent >= OTP_MAX_SENDS_PER_WINDOW) return false;

    const code = randomInt(0, 1_000_000).toString().padStart(6, '0');
    await this.prisma.$transaction([
      this.prisma.otpCode.updateMany({
        where: { phone, purpose: 'LOGIN', consumedAt: null },
        data: { consumedAt: new Date() },
      }),
      this.prisma.otpCode.create({
        data: {
          phone,
          purpose: 'LOGIN',
          codeHash: this.hash(phone, code),
          expiresAt: new Date(Date.now() + OTP_TTL_MS),
        },
      }),
    ]);
    await this.sms.send(phone, `Your SAANA RIDES code is ${code}. It expires in 5 minutes.`);
    return true;
  }

  /** Single-use, expiring, attempt-limited verification. */
  async verify(phone: string, code: string): Promise<boolean> {
    const otp = await this.prisma.otpCode.findFirst({
      where: { phone, purpose: 'LOGIN', consumedAt: null, expiresAt: { gt: new Date() } },
      orderBy: { createdAt: 'desc' },
    });
    if (!otp) return false;

    const attempts = otp.attempts + 1;
    const matches = this.safeEqual(otp.codeHash, this.hash(phone, code));
    const consume = matches || attempts >= OTP_MAX_ATTEMPTS;
    const updated = await this.prisma.otpCode.updateMany({
      where: { id: otp.id, consumedAt: null, attempts: otp.attempts },
      data: { attempts, consumedAt: consume ? new Date() : null },
    });
    return matches && updated.count === 1;
  }

  private hash(phone: string, code: string): string {
    return createHmac('sha256', this.config.JWT_ACCESS_SECRET)
      .update(`otp:${phone}:${code}`)
      .digest('hex');
  }

  private safeEqual(a: string, b: string): boolean {
    const x = Buffer.from(a, 'hex');
    const y = Buffer.from(b, 'hex');
    return x.length === y.length && timingSafeEqual(x, y);
  }
}
