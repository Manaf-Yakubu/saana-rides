import { CanActivate, ExecutionContext, ForbiddenException, Injectable } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { AUTHORIZE_RULES, type AuthorizeRule } from '../decorators/authorize.decorator';
import { IS_PUBLIC } from '../decorators/public.decorator';
import type { Principal } from '../principal';

export function isAllowed(principal: Principal, rules: readonly AuthorizeRule[]): boolean {
  return rules.some((rule) => {
    if (!rule.roles.includes(principal.role)) return false;
    if (principal.role !== 'STAFF' || !rule.staffTypes) return true;
    return rule.staffTypes.some((t) => principal.staffTypes.includes(t));
  });
}

@Injectable()
export class PolicyGuard implements CanActivate {
  constructor(private readonly reflector: Reflector) {}

  canActivate(ctx: ExecutionContext): boolean {
    const targets = [ctx.getHandler(), ctx.getClass()];
    if (this.reflector.getAllAndOverride<boolean>(IS_PUBLIC, targets)) return true;

    const rules = this.reflector.getAllAndOverride<AuthorizeRule[] | undefined>(
      AUTHORIZE_RULES,
      targets,
    );
    const principal = ctx.switchToHttp().getRequest<{ principal?: Principal }>().principal;
    if (!rules?.length || !principal || !isAllowed(principal, rules)) {
      throw new ForbiddenException();
    }
    return true;
  }
}
