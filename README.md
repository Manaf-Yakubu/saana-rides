# SAANA RIDES

SAANA RIDES is a fleet, driver-ownership (hire-purchase) and ride-hailing platform for Keke and Cambuu vehicles in Ghana.

It is a modular monolith in a pnpm + Turborepo monorepo:

| Path                 | What                                                                 |
| -------------------- | -------------------------------------------------------------------- |
| `apps/api`           | NestJS REST API (OpenAPI at `/docs`), Prisma + PostgreSQL 16/PostGIS |
| `apps/web`           | Next.js management & staff dashboard                                 |
| `apps/driver-app`    | Expo driver app (Phase 2)                                            |
| `apps/passenger-app` | Expo passenger app (Phase 3)                                         |
| `packages/shared`    | Zod schemas, enums, state machines, `Money` (integer pesewas)        |
| `packages/ui`        | Shared web UI components                                             |
| `packages/config`    | Shared tsconfig / eslint presets                                     |

## Quick start (under 10 minutes)

Prerequisites: Node 20 (`nvm use`), pnpm 9 (`corepack enable`), Docker.

```bash
cp .env.example .env && cp .env.example apps/api/.env
docker compose up -d                  # postgres+postgis, redis, minio, mailpit
pnpm install
pnpm --filter @saana/api prisma:deploy
pnpm dev                              # api :4000 (docs at /docs), web :3000
```

## Checks

```bash
pnpm lint && pnpm typecheck && pnpm test
pnpm --filter @saana/api test:int     # integration tests (Testcontainers, needs Docker)
pnpm build
```

## Docs

These are in `docs/`: [ARCHITECTURE](docs/ARCHITECTURE.md), [DATA_MODEL](docs/DATA_MODEL.md), [API](docs/API.md), [OPEN_DECISIONS](docs/OPEN_DECISIONS.md), [SECURITY](docs/SECURITY.md) and [RUNBOOK](docs/RUNBOOK.md).
