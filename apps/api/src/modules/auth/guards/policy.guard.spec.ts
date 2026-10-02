import { ExecutionContext, ForbiddenException } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { AUTHORIZE_RULES, type AuthorizeRule } from '../decorators/authorize.decorator';
import { IS_PUBLIC } from '../decorators/public.decorator';
import type { Principal } from '../principal';
import { PolicyGuard, isAllowed } from './policy.guard';

const mgmt: Principal = { userId: 'm', role: 'MANAGEMENT', staffTypes: [] };
const finance: Principal = { userId: 'f', role: 'STAFF', staffTypes: ['FINANCE'] };
const fleet: Principal = { userId: 'fl', role: 'STAFF', staffTypes: ['FLEET', 'OPERATIONS'] };
const driver: Principal = { userId: 'd', role: 'DRIVER', staffTypes: [] };

describe('isAllowed', () => {
  const financeOrMgmt: AuthorizeRule[] = [
    { roles: ['MANAGEMENT', 'STAFF'], staffTypes: ['FINANCE'] },
  ];

  it('scopes staff by staff type but not management', () => {
    expect(isAllowed(mgmt, financeOrMgmt)).toBe(true);
    expect(isAllowed(finance, financeOrMgmt)).toBe(true);
    expect(isAllowed(fleet, financeOrMgmt)).toBe(false);
    expect(isAllowed(driver, financeOrMgmt)).toBe(false);
  });

  it('ORs rules and allows any staff type when none listed', () => {
    const rules: AuthorizeRule[] = [{ roles: ['DRIVER'] }, { roles: ['STAFF'] }];
    expect(isAllowed(driver, rules)).toBe(true);
    expect(isAllowed(fleet, rules)).toBe(true);
    expect(isAllowed(mgmt, rules)).toBe(false);
  });

  it('denies with no rules', () => {
    expect(isAllowed(mgmt, [])).toBe(false);
  });
});

describe('PolicyGuard', () => {
  const ctx = (principal?: Principal) =>
    ({
      getHandler: () => undefined,
      getClass: () => undefined,
      switchToHttp: () => ({ getRequest: () => ({ principal }) }),
    }) as unknown as ExecutionContext;

  const guardWith = (meta: Record<string, unknown>) => {
    const reflector = { getAllAndOverride: (key: string) => meta[key] } as unknown as Reflector;
    return new PolicyGuard(reflector);
  };

  it('denies authenticated routes without a policy (deny by default)', () => {
    expect(() => guardWith({}).canActivate(ctx(mgmt))).toThrow(ForbiddenException);
  });

  it('allows public routes without a principal', () => {
    expect(guardWith({ [IS_PUBLIC]: true }).canActivate(ctx())).toBe(true);
  });

  it('enforces declared rules', () => {
    const guard = guardWith({ [AUTHORIZE_RULES]: [{ roles: ['MANAGEMENT'] }] });
    expect(guard.canActivate(ctx(mgmt))).toBe(true);
    expect(() => guard.canActivate(ctx(driver))).toThrow(ForbiddenException);
    expect(() => guard.canActivate(ctx())).toThrow(ForbiddenException);
  });
});
