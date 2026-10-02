const values = <T extends string>(...v: T[]) => v;

export const UserRole = values('MANAGEMENT', 'STAFF', 'DRIVER', 'PASSENGER');
export type UserRole = (typeof UserRole)[number];

export const StaffType = values('FINANCE', 'FLEET', 'OPERATIONS', 'SUPPORT');
export type StaffType = (typeof StaffType)[number];

export const DriverStatus = values('PENDING', 'VERIFIED', 'ACTIVE', 'SUSPENDED');
export type DriverStatus = (typeof DriverStatus)[number];

export const VehicleType = values('KEKE', 'CAMBUU');
export type VehicleType = (typeof VehicleType)[number];

export const OwnerType = values('COMPANY', 'DRIVER');
export type OwnerType = (typeof OwnerType)[number];

export const VehicleStatus = values(
  'AVAILABLE',
  'ASSIGNED',
  'ACTIVE',
  'ON_TRIP',
  'MAINTENANCE',
  'OWNERSHIP_TRANSFERRED',
  'RETIRED',
);
export type VehicleStatus = (typeof VehicleStatus)[number];

export const PaymentFrequency = values('DAILY', 'WEEKLY', 'MONTHLY');
export type PaymentFrequency = (typeof PaymentFrequency)[number];

export const ContractStatus = values(
  'DRAFT',
  'ACTIVE',
  'OVERDUE',
  'SUSPENDED',
  'COMPLETED',
  'TRANSFER_PENDING',
  'OWNERSHIP_TRANSFERRED',
  'CANCELLED',
  'TERMINATED',
);
export type ContractStatus = (typeof ContractStatus)[number];

/** Contract statuses during which the vehicle and driver are bound to the contract. */
export const LIVE_CONTRACT_STATUSES = [
  'ACTIVE',
  'OVERDUE',
  'SUSPENDED',
  'COMPLETED',
  'TRANSFER_PENDING',
] as const satisfies readonly ContractStatus[];

export const ScheduleItemStatus = values('PENDING', 'PAID', 'PARTIAL', 'OVERDUE', 'WAIVED');
export type ScheduleItemStatus = (typeof ScheduleItemStatus)[number];

export const PaymentMethod = values('MOMO', 'CARD', 'CASH', 'BANK_TRANSFER');
export type PaymentMethod = (typeof PaymentMethod)[number];

export const PaymentStatus = values('PENDING', 'SUCCESSFUL', 'FAILED', 'REVERSED');
export type PaymentStatus = (typeof PaymentStatus)[number];

export const AdjustmentType = values('REVERSAL', 'CORRECTION', 'WAIVER');
export type AdjustmentType = (typeof AdjustmentType)[number];

export const DailySalesStatus = values('SUBMITTED', 'VERIFIED', 'DISPUTED');
export type DailySalesStatus = (typeof DailySalesStatus)[number];

export const TransferStatus = values(
  'ELIGIBLE',
  'UNDER_REVIEW',
  'APPROVED',
  'PAPERWORK_PENDING',
  'COMPLETED',
  'REJECTED',
);
export type TransferStatus = (typeof TransferStatus)[number];

export const IssueStatus = values('OPEN', 'IN_PROGRESS', 'RESOLVED');
export type IssueStatus = (typeof IssueStatus)[number];

export const DocumentType = values(
  'GHANA_CARD',
  'LICENCE',
  'VEHICLE_REG',
  'INSURANCE',
  'ROADWORTHY',
  'CONTRACT_PDF',
  'OTHER',
);
export type DocumentType = (typeof DocumentType)[number];

export const RideStatus = values(
  'REQUESTED',
  'SEARCHING',
  'ACCEPTED',
  'ARRIVING',
  'ARRIVED',
  'IN_PROGRESS',
  'COMPLETED',
  'CANCELLED_BY_PASSENGER',
  'CANCELLED_BY_DRIVER',
  'NO_DRIVERS',
);
export type RideStatus = (typeof RideStatus)[number];
