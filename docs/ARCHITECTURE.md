# Architecture

## Overview

```mermaid
flowchart LR
  web[Next.js dashboard] -->|REST| api[NestJS API]
  driver[Driver app - Phase 2] -->|REST| api
  passenger[Passenger app - Phase 3] -->|REST + Socket.IO| api
  api --> pg[(PostgreSQL 16 + PostGIS)]
  api --> redis[(Redis: BullMQ, rate limits, GEO)]
  api --> s3[(S3/R2 private bucket)]
  api --> ext[Paystack / SMS / FCM via provider interfaces]
```

## Decisions

- **Modular monolith.** Each business area is a NestJS module with its own service and controller. Modules talk to each other only through exported services, so a module can later be split out.
- **Pure domain logic in `packages/shared`.** This covers Money, state machines, schedule generation and payment allocation. It has no I/O, it is unit-tested, and the apps reuse it.
- **Money is integer pesewas (`bigint` / `BIGINT`).** Balances are always derived from the ledger.
- **Prisma for schema and migrations.** Raw SQL migrations cover what Prisma can't express: partial unique indexes, insert-only triggers and PostGIS. Row locks use `SELECT ... FOR UPDATE` via `$queryRaw` inside interactive transactions.
- **Integration tests use real Postgres through Testcontainers.** Database mocks would hide locking and constraint behaviour.
- **External services sit behind interfaces** (`PaymentProvider`, `SmsProvider`, `MapsProvider`, `StorageProvider`), so providers can be swapped.
