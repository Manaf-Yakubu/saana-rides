import { Injectable, UnauthorizedException } from '@nestjs/common';
import type { User } from '@prisma/client';
import {
  normalizeGhanaPhone,
  type AuthTokens,
  type AuthUser,
  type MfaEnrollment,
  type PasswordLoginResult,
} from '@saana/shared';
import type { RequestMeta } from '../../common/request-meta';
import { FieldEncryptionService } from '../../infra/crypto/field-encryption.service';
import { PrismaService } from '../../infra/prisma/prisma.service';
import { AuditService } from '../audit/audit.service';
import { OtpService } from './otp.service';
import { PasswordService } from './password.service';
import type { Principal } from './principal';
import { TokenService } from './token.service';
import { TotpService } from './totp.service';

export const MAX_FAILED_LOGINS = 5;
export const LOCKOUT_MS = 15 * 60_000;

const PASSWORD_ROLES: User['role'][] = ['MANAGEMENT', 'STAFF'];
const OTP_ROLES: User['role'][] = ['DRIVER', 'PASSENGER'];

const invalid = () => new UnauthorizedException('Invalid credentials');

@Injectable()
export class AuthService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly passwords: PasswordService,
    private readonly totp: TotpService,
    private readonly otp: OtpService,
    private readonly tokens: TokenService,
    private readonly crypto: FieldEncryptionService,
    private readonly audit: AuditService,
  ) {}

  /** Step 1 for Management/Staff. Always ends in a TOTP challenge; 2FA is mandatory. */
  async loginWithPassword(
    identifier: string,
    password: string,
    meta: RequestMeta,
  ): Promise<PasswordLoginResult> {
    const user = await this.findInternalUser(identifier);
    if (!user?.passwordHash) {
      await this.passwords.verifyDummy(password);
      await this.audit.record({ actorId: null, action: 'auth.login_failed', entity: 'user', meta });
      throw invalid();
    }
    if (this.isLocked(user)) {
      await this.audit.record({
        actorId: user.id,
        action: 'auth.login_locked',
        entity: 'user',
        entityId: user.id,
        meta,
      });
      throw invalid();
    }
    if (!(await this.passwords.verify(user.passwordHash, password))) {
      await this.registerFailure(user, meta);
      throw invalid();
    }
    if (user.mfaEnabledAt) {
      return {
        status: 'MFA_REQUIRED',
        mfaToken: await this.tokens.signMfaToken(user.id, 'verify'),
      };
    }
    return {
      status: 'MFA_ENROLLMENT_REQUIRED',
      mfaToken: await this.tokens.signMfaToken(user.id, 'enroll'),
    };
  }

  async enrollMfa(mfaToken: string): Promise<MfaEnrollment> {
    const { sub, purpose } = await this.tokens.verifyMfaToken(mfaToken);
    const user = await this.activeUser(sub);
    if (purpose !== 'enroll' || user.mfaEnabledAt) throw invalid();

    const secret = this.totp.generateSecret();
    await this.prisma.user.update({
      where: { id: user.id },
      data: { mfaSecret: this.crypto.encrypt(secret) },
    });
    return { secret, otpauthUri: this.totp.uri(secret, user.email ?? user.phone) };
  }

  async verifyMfa(mfaToken: string, code: string, meta: RequestMeta): Promise<AuthTokens> {
    const { sub } = await this.tokens.verifyMfaToken(mfaToken);
    const user = await this.activeUser(sub);
    if (!user.mfaSecret || this.isLocked(user)) throw invalid();

    const check = this.totp.check(
      this.crypto.decrypt(user.mfaSecret),
      code,
      user.mfaLastTimeStep ?? undefined,
    );
    if (!check.valid) {
      await this.registerFailure(user, meta);
      throw invalid();
    }
    // Reject codes from an already-used time step (replay), atomically against concurrent logins.
    const accepted = await this.prisma.user.updateMany({
      where: {
        id: user.id,
        OR: [{ mfaLastTimeStep: null }, { mfaLastTimeStep: { lt: check.timeStep } }],
      },
      data: {
        mfaLastTimeStep: check.timeStep,
        mfaEnabledAt: user.mfaEnabledAt ?? new Date(),
        failedLoginCount: 0,
        lockedUntil: null,
        lastLoginAt: new Date(),
      },
    });
    if (accepted.count !== 1) throw invalid();

    if (!user.mfaEnabledAt) {
      await this.audit.record({
        actorId: user.id,
        action: 'auth.mfa_enrolled',
        entity: 'user',
        entityId: user.id,
        meta,
      });
    }
    await this.audit.record({
      actorId: user.id,
      action: 'auth.login_succeeded',
      entity: 'user',
      entityId: user.id,
      meta,
    });
    return this.tokens.issueSession(user, user.staffProfile?.staffTypes ?? [], meta);
  }

  /** Always resolves, so callers cannot probe which phones are registered. */
  async requestOtp(phone: string): Promise<void> {
    const user = await this.prisma.user.findFirst({
      where: { phone, role: { in: OTP_ROLES }, status: 'ACTIVE', deletedAt: null },
    });
    if (user) await this.otp.send(phone);
  }

  async verifyOtp(phone: string, code: string, meta: RequestMeta): Promise<AuthTokens> {
    const user = await this.prisma.user.findFirst({
      where: { phone, role: { in: OTP_ROLES }, status: 'ACTIVE', deletedAt: null },
    });
    if (!user || !(await this.otp.verify(phone, code))) {
      await this.audit.record({
        actorId: user?.id ?? null,
        action: 'auth.otp_failed',
        entity: 'user',
        entityId: user?.id ?? null,
        meta,
      });
      throw invalid();
    }
    await this.prisma.user.update({ where: { id: user.id }, data: { lastLoginAt: new Date() } });
    await this.audit.record({
      actorId: user.id,
      action: 'auth.login_succeeded',
      entity: 'user',
      entityId: user.id,
      meta,
    });
    return this.tokens.issueSession(user, [], meta);
  }

  refresh(refreshToken: string, meta: RequestMeta): Promise<AuthTokens> {
    return this.tokens.rotate(refreshToken, meta);
  }

  async logout(refreshToken: string, meta: RequestMeta): Promise<void> {
    const userId = await this.tokens.revokeByPresentedToken(refreshToken);
    if (userId) {
      await this.audit.record({
        actorId: userId,
        action: 'auth.logout',
        entity: 'user',
        entityId: userId,
        meta,
      });
    }
  }

  async me(principal: Principal): Promise<AuthUser> {
    const user = await this.activeUser(principal.userId);
    return {
      id: user.id,
      phone: user.phone,
      email: user.email,
      role: user.role,
      staffTypes: principal.staffTypes,
    };
  }

  private findInternalUser(identifier: string) {
    const where = identifier.includes('@')
      ? { email: identifier.toLowerCase() }
      : { phone: normalizeGhanaPhone(identifier) ?? '' };
    return this.prisma.user.findFirst({
      where: { ...where, role: { in: PASSWORD_ROLES }, status: 'ACTIVE', deletedAt: null },
    });
  }

  private async activeUser(id: string) {
    const user = await this.prisma.user.findFirst({
      where: { id, status: 'ACTIVE', deletedAt: null },
      include: { staffProfile: true },
    });
    if (!user) throw invalid();
    return user;
  }

  private isLocked(user: Pick<User, 'lockedUntil'>): boolean {
    return !!user.lockedUntil && user.lockedUntil > new Date();
  }

  private async registerFailure(user: Pick<User, 'id'>, meta: RequestMeta): Promise<void> {
    const updated = await this.prisma.user.update({
      where: { id: user.id },
      data: { failedLoginCount: { increment: 1 } },
    });
    await this.audit.record({
      actorId: user.id,
      action: 'auth.login_failed',
      entity: 'user',
      entityId: user.id,
      meta,
    });
    if (updated.failedLoginCount >= MAX_FAILED_LOGINS) {
      await this.prisma.user.update({
        where: { id: user.id },
        data: { failedLoginCount: 0, lockedUntil: new Date(Date.now() + LOCKOUT_MS) },
      });
      await this.audit.record({
        actorId: user.id,
        action: 'auth.account_locked',
        entity: 'user',
        entityId: user.id,
        meta,
      });
    }
  }
}
