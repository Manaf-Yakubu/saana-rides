# Data model

This document is kept in sync with `apps/api/prisma/schema.prisma`. Each slice adds its tables here.

## Conventions

- Primary keys are UUIDs (`gen_random_uuid()`).
- Timestamps are `timestamptz`, stored in UTC and displayed in `Africa/Accra`.
- Money columns are `BIGINT` pesewas, with `currency CHAR(3) DEFAULT 'GHS'`.
- `deleted_at` is used for soft deletes on people and vehicles.

## Phase 1 ERD (target)

```mermaid
erDiagram
  users ||--o| staff_profiles : has
  users ||--o| driver_profiles : has
  driver_profiles ||--o{ contracts : signs
  vehicles ||--o{ contracts : "subject of"
  packages ||--o{ contracts : "template for"
  contracts ||--o{ payment_schedule_items : generates
  contracts ||--o{ contract_events : timeline
  contracts ||--o{ contract_charges : "late fees"
  contracts ||--o{ payments : receives
  payments ||--o{ payment_allocations : "split into"
  payment_schedule_items ||--o{ payment_allocations : "paid by"
  payments ||--o{ payment_adjustments : "corrected by"
  contracts ||--o| ownership_transfers : "results in"
  vehicles ||--o{ vehicle_ownership_history : records
  vehicles ||--o{ maintenance_records : has
  vehicles ||--o{ vehicle_issues : has
  driver_profiles ||--o{ daily_sales : records
  settings ||--o{ setting_versions : versioned
```

## Implemented

- `settings`, `setting_versions`: typed business-rule settings. Each change writes a new version row.
