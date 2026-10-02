import type { StaffType, UserRole } from '@saana/shared';

export interface Principal {
  userId: string;
  role: UserRole;
  staffTypes: StaffType[];
}
