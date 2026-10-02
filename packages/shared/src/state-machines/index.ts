import {
  ContractStatus,
  DailySalesStatus,
  IssueStatus,
  PaymentStatus,
  RideStatus,
  ScheduleItemStatus,
  TransferStatus,
  VehicleStatus,
} from '../enums';
import { defineStateMachine } from './state-machine';

export * from './state-machine';

export const vehicleStateMachine = defineStateMachine<VehicleStatus>('vehicle', VehicleStatus, {
  AVAILABLE: ['ASSIGNED', 'MAINTENANCE', 'RETIRED'],
  ASSIGNED: ['ACTIVE', 'AVAILABLE', 'MAINTENANCE'],
  ACTIVE: ['ON_TRIP', 'MAINTENANCE', 'AVAILABLE', 'OWNERSHIP_TRANSFERRED'],
  ON_TRIP: ['ACTIVE'],
  MAINTENANCE: ['AVAILABLE', 'ASSIGNED', 'ACTIVE', 'RETIRED'],
  OWNERSHIP_TRANSFERRED: [],
  RETIRED: [],
});

export const contractStateMachine = defineStateMachine<ContractStatus>('contract', ContractStatus, {
  DRAFT: ['ACTIVE', 'CANCELLED'],
  ACTIVE: ['OVERDUE', 'SUSPENDED', 'COMPLETED', 'CANCELLED', 'TERMINATED'],
  OVERDUE: ['ACTIVE', 'SUSPENDED', 'COMPLETED', 'CANCELLED', 'TERMINATED'],
  SUSPENDED: ['ACTIVE', 'OVERDUE', 'CANCELLED', 'TERMINATED'],
  COMPLETED: ['TRANSFER_PENDING'],
  TRANSFER_PENDING: ['OWNERSHIP_TRANSFERRED', 'COMPLETED'],
  OWNERSHIP_TRANSFERRED: [],
  CANCELLED: [],
  TERMINATED: [],
});

export const scheduleItemStateMachine = defineStateMachine<ScheduleItemStatus>(
  'schedule_item',
  ScheduleItemStatus,
  {
    PENDING: ['PAID', 'PARTIAL', 'OVERDUE', 'WAIVED'],
    PARTIAL: ['PAID', 'OVERDUE', 'WAIVED', 'PENDING'],
    OVERDUE: ['PAID', 'PARTIAL', 'WAIVED'],
    // PAID can reopen only when a payment allocated to it is reversed.
    PAID: ['PARTIAL', 'PENDING', 'OVERDUE'],
    WAIVED: [],
  },
);

export const paymentStateMachine = defineStateMachine<PaymentStatus>('payment', PaymentStatus, {
  PENDING: ['SUCCESSFUL', 'FAILED'],
  SUCCESSFUL: ['REVERSED'],
  FAILED: [],
  REVERSED: [],
});

export const transferStateMachine = defineStateMachine<TransferStatus>(
  'ownership_transfer',
  TransferStatus,
  {
    ELIGIBLE: ['UNDER_REVIEW', 'REJECTED'],
    UNDER_REVIEW: ['APPROVED', 'REJECTED'],
    APPROVED: ['PAPERWORK_PENDING', 'REJECTED'],
    PAPERWORK_PENDING: ['COMPLETED', 'REJECTED'],
    COMPLETED: [],
    REJECTED: [],
  },
);

export const dailySalesStateMachine = defineStateMachine<DailySalesStatus>(
  'daily_sales',
  DailySalesStatus,
  {
    SUBMITTED: ['VERIFIED', 'DISPUTED'],
    DISPUTED: ['VERIFIED', 'SUBMITTED'],
    VERIFIED: [],
  },
);

export const issueStateMachine = defineStateMachine<IssueStatus>('vehicle_issue', IssueStatus, {
  OPEN: ['IN_PROGRESS', 'RESOLVED'],
  IN_PROGRESS: ['RESOLVED', 'OPEN'],
  RESOLVED: ['OPEN'],
});

export const rideStateMachine = defineStateMachine<RideStatus>('ride', RideStatus, {
  REQUESTED: ['SEARCHING', 'CANCELLED_BY_PASSENGER'],
  SEARCHING: ['ACCEPTED', 'NO_DRIVERS', 'CANCELLED_BY_PASSENGER'],
  ACCEPTED: ['ARRIVING', 'CANCELLED_BY_PASSENGER', 'CANCELLED_BY_DRIVER'],
  ARRIVING: ['ARRIVED', 'CANCELLED_BY_PASSENGER', 'CANCELLED_BY_DRIVER'],
  ARRIVED: ['IN_PROGRESS', 'CANCELLED_BY_PASSENGER', 'CANCELLED_BY_DRIVER'],
  IN_PROGRESS: ['COMPLETED'],
  COMPLETED: [],
  CANCELLED_BY_PASSENGER: [],
  CANCELLED_BY_DRIVER: [],
  NO_DRIVERS: [],
});

export const ALL_STATE_MACHINES = [
  vehicleStateMachine,
  contractStateMachine,
  scheduleItemStateMachine,
  paymentStateMachine,
  transferStateMachine,
  dailySalesStateMachine,
  issueStateMachine,
  rideStateMachine,
] as const;
