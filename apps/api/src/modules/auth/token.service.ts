import { Inject, Injectable, UnauthorizedException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import type { User } from '@prisma/client';
import type { AuthTokens, StaffType } from '@saana/shared';
import { createHash, randomBytes, randomUUID, timingSafeEqual } from 'node:crypto';
import type { RequestMeta } from '../../common/request-meta';
import type { AppConfig } from '../../config';
import { APP_CONFIG } from '../../infra/config/config.module';
import { PrismaService } from '../../infra/prisma/prisma.service';
import { AuditService } from '../audit/audit.service';

export type MfaPurpose = 'enroll' | 'verify';

interface AccessPayload {
  sub: string;
  role: User['role'];
  typ: 'access';
}

interface MfaPayload {
  sub: string;
  typ: 'mfa';
  purpose: MfaPurpose;
}

const MFA_TOKEN_TTL_SECONDS = 300;

const sha256 = (value: string) => createHash('sha256').update(value).digest();

@Injectable()
export class TokenService {
  constructor(
    private readonly jwt: JwtService,
    private readonly prisma: PrismaService,
    private readonly audit: AuditService,
    @Inject(APP_CONFIG)
    private readonly config: Pick<AppConfig, 'JWT_ACCESS_TTL_SECONDS' | 'REFRESH_TOKEN_TTL_DAYS'>,
  ) {}

  signAccessToken(user: Pick<User, 'id' | 'role'>): Promise<string> {
    const payload: AccessPayload = { sub: user.id, role: user.role, typ: 'access' };
    return this.jwt.signAsync(payload, { expiresIn: this.config.JWT_ACCESS_TTL_SECONDS });
  }

  async verifyAccessToken(token: string): Promise<AccessPayload> {
    const payload = await this.verify<AccessPayload>(token);
    if (payload.typ !== 'access') throw new UnauthorizedException();
    return payload;
  }

  signMfaToken(userId: string, purpose: MfaPurpose): Promise<string> {
    const payload: MfaPayload = { sub: userId, typ: 'mfa', purpose };
    return this.jwt.signAsync(payload, { expiresIn: MFA_TOKEN_TTL_SECONDS });
  }

  async verifyMfaToken(token: string): Promise<MfaPayload> {
    const payload = await this.verify<MfaPayload>(token);
    if (payload.typ !== 'mfa') throw new UnauthorizedException();
    return payload;
  }

  /** Issues an access token plus a new refresh token, optionally continuing an existing family. */
  async issueSession(
    user: Pick<User, 'id' | 'role' | 'phone' | 'email'>,
    staffTypes: StaffType[],
    meta: RequestMeta,
  ): Promise<AuthTokens> {
    const refreshToken = await this.createRefreshToken(user.id, randomUUID(), meta);
    return this.buildTokens(user, staffTypes, refreshToken);
  }

  /**
   * Rotates a refresh token. Presenting a token that was already rotated means it leaked:
   * the whole family is revoked and the caller must log in again.
   */
  async rotate(presented: string, meta: RequestMeta): Promise<AuthTokens> {
    const record = await this.findByPresentedToken(presented);
    if (!record) throw new UnauthorizedException();

    if (record.revokedAt) {
      if (record.revokedReason === 'ROTATED') {
        await this.revokeFamily(record.familyId, 'REUSE_DETECTED');
        await this.audit.record({
          actorId: record.userId,
          action: 'auth.refresh_reuse_detected',
          entity: 'refresh_token_family',
          entityId: record.familyId,
          meta,
        });
      }
      throw new UnauthorizedException();
    }
    if (record.expiresAt <= new Date()) throw new UnauthorizedException();

    const user = await this.prisma.user.findFirst({
      where: { id: record.userId, status: 'ACTIVE', deletedAt: null },
      include: { staffProfile: true },
    });
    if (!user) throw new UnauthorizedException();

    const next = await this.prisma.$transaction(async (tx) => {
      const nextId = randomUUID();
      // Compare-and-set: only one concurrent caller can rotate a given token.
      const claimed = await tx.refreshToken.updateMany({
        where: { id: record.id, revokedAt: null },
        data: { revokedAt: new Date(), revokedReason: 'ROTATED', replacedById: nextId },
      });
      if (claimed.count !== 1) return null;
      return this.createRefreshToken(user.id, record.familyId, meta, nextId, tx);
    });
    if (!next) throw new UnauthorizedException();
    return this.buildTokens(user, user.staffProfile?.staffTypes ?? [], next);
  }

  async revokeByPresentedToken(presented: string): Promise<string | null> {
    const record = await this.findByPresentedToken(presented);
    if (!record) return null;
    await this.revokeFamily(record.familyId, 'LOGOUT');
    return record.userId;
  }

  private async revokeFamily(familyId: string, reason: string): Promise<void> {
    await this.prisma.refreshToken.updateMany({
      where: { familyId, revokedAt: null },
      data: { revokedAt: new Date(), revokedReason: reason },
    });
  }

  private async findByPresentedToken(presented: string) {
    const [id, secret] = presented.split('.');
    if (!id || !secret || !/^[0-9a-f-]{36}$/.test(id)) return null;
    const record = await this.prisma.refreshToken.findUnique({ where: { id } });
    if (!record) return null;
    const expected = Buffer.from(record.tokenHash, 'hex');
    const actual = sha256(secret);
    return expected.length === actual.length && timingSafeEqual(expected, actual) ? record : null;
  }

  private async createRefreshToken(
    userId: string,
    familyId: string,
    meta: RequestMeta,
    id: string = randomUUID(),
    db: Pick<PrismaService, 'refreshToken'> = this.prisma,
  ): Promise<string> {
    const secret = randomBytes(32).toString('base64url');
    await db.refreshToken.create({
      data: {
        id,
        userId,
        familyId,
        tokenHash: sha256(secret).toString('hex'),
        expiresAt: new Date(Date.now() + this.config.REFRESH_TOKEN_TTL_DAYS * 86_400_000),
        ip: meta.ip,
        userAgent: meta.userAgent,
      },
    });
    return `${id}.${secret}`;
  }

  private async buildTokens(
    user: Pick<User, 'id' | 'role' | 'phone' | 'email'>,
    staffTypes: StaffType[],
    refreshToken: string,
  ): Promise<AuthTokens> {
    return {
      accessToken: await this.signAccessToken(user),
      accessTokenExpiresIn: this.config.JWT_ACCESS_TTL_SECONDS,
      refreshToken,
      user: { id: user.id, phone: user.phone, email: user.email, role: user.role, staffTypes },
    };
  }

  private async verify<T extends object>(token: string): Promise<T> {
    try {
      return await this.jwt.verifyAsync<T>(token, { algorithms: ['HS256'] });
    } catch {
      throw new UnauthorizedException();
    }
  }
}
