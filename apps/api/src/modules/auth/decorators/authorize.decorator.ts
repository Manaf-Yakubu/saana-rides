import { SetMetadata } from '@nestjs/common';
import type { StaffType, UserRole } from '@saana/shared';

export const AUTHORIZE_RULES = 'auth:rules';

export interface AuthorizeRule {
  roles: UserRole[];
  /** When set, STAFF principals must hold at least one of these staff types. */
  staffTypes?: StaffType[];
}

/**
 * Declares who may call a route; rules are ORed. Every authenticated route must declare
 * at least one rule: routes without one are denied. Resource ownership is checked in services.
 */
export const Authorize = (...rules: AuthorizeRule[]) => SetMetadata(AUTHORIZE_RULES, rules);

export const ANY_ROLE: AuthorizeRule = { roles: ['MANAGEMENT', 'STAFF', 'DRIVER', 'PASSENGER'] };
