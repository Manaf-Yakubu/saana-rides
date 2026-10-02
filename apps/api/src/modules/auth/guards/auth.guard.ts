import { CanActivate, ExecutionContext, Injectable, UnauthorizedException } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import type { Request } from 'express';
import { PrismaService } from '../../../infra/prisma/prisma.service';
import { IS_PUBLIC } from '../decorators/public.decorator';
import type { Principal } from '../principal';
import { TokenService } from '../token.service';

@Injectable()
export class AuthGuard implements CanActivate {
  constructor(
    private readonly reflector: Reflector,
    private readonly tokens: TokenService,
    private readonly prisma: PrismaService,
  ) {}

  async canActivate(ctx: ExecutionContext): Promise<boolean> {
    if (this.reflector.getAllAndOverride<boolean>(IS_PUBLIC, [ctx.getHandler(), ctx.getClass()])) {
      return true;
    }
    const req = ctx.switchToHttp().getRequest<Request & { principal?: Principal }>();
    const [scheme, token] = (req.get('authorization') ?? '').split(' ');
    if (scheme !== 'Bearer' || !token) throw new UnauthorizedException();

    const payload = await this.tokens.verifyAccessToken(token);
    const user = await this.prisma.user.findFirst({
      where: { id: payload.sub, status: 'ACTIVE', deletedAt: null },
      include: { staffProfile: true },
    });
    if (!user) throw new UnauthorizedException();

    req.principal = {
      userId: user.id,
      role: user.role,
      staffTypes: user.staffProfile?.staffTypes ?? [],
    };
    return true;
  }
}
