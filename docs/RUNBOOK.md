# Runbook

## Local services

`docker compose up -d` starts:

| Service            | Port(s)             |
| ------------------ | ------------------- |
| Postgres (PostGIS) | 5432                |
| Redis              | 6379                |
| MinIO              | 9000 (console 9001) |
| Mailpit            | 8025                |

## Migrations

- `pnpm --filter @saana/api prisma:deploy` applies the migrations.
- New migrations are generated with `prisma migrate dev --name <name>`.

## To be completed in Phase 1

- Deploy steps
- Daily encrypted backups and the tested restore procedure
- Incident checklist
