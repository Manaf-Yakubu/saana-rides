# Security

The full threat model will be completed during Phase 1. It covers payment fraud, privilege escalation, webhook spoofing and driver location privacy.

## Baseline (in place)

- `helmet` security headers, a strict CORS allow-list from `CORS_ORIGINS`, and no `x-powered-by` header on the web app.
- Logs redact authorization headers, cookies, passwords, OTP/TOTP codes, refresh tokens and MFA tokens.
- argon2id passwords (19 MiB, t=2, p=1); unknown users still pay for a dummy hash so timing does not reveal accounts.
- Mandatory TOTP for Management and Staff: password login only ever returns a 5-minute `mfaToken`. TOTP secrets are AES-256-GCM encrypted; a used time step cannot be replayed.
- Drivers/passengers log in with a 6-digit SMS OTP: HMAC-hashed at rest, 5 min expiry, single-use, burned after 5 wrong attempts, max 3 sends per phone per 15 min. Requests for unknown phones return the same 202.
- Account lockout for 15 minutes after 5 failed password/TOTP attempts.
- Short-lived JWT access tokens (HS256, 15 min). Refresh tokens are opaque, stored as SHA-256 hashes, rotated on every use with a compare-and-set; presenting an already-rotated token revokes the whole family (reuse detection). Logout revokes the family.
- Global guards: rate limit (`RATE_LIMIT_PER_MINUTE`, in-memory until Redis lands), authentication, then a policy guard that denies any route without an explicit `@Authorize(...)` rule. Staff rules can be narrowed by staff type.
- Insert-only `audit_logs`: a DB trigger rejects UPDATE, DELETE and TRUNCATE. Logins, failures, lockouts, MFA enrolment, logout and refresh-token reuse are audited.
- Production refuses to start with placeholder secrets (`change-me` / `dev-only`).
- Secrets live only in the environment. `.env.example` lists the variables; `.env` files are gitignored.
- CI runs `pnpm audit` (high and above), gitleaks secret scanning and Dependabot.

## Planned (Phase 1)

- Resource-ownership checks (driver sees only their own records) in each domain module, with cross-driver denial tests.
- Redis-backed rate limiting shared across API instances.
- Ghana Card field encryption using the existing AES-256-GCM service, with a blind index for lookups.
- Private document bucket served through short-lived signed URLs, with access logging.
- Insert-only audit log enforced by a DB trigger.
- Ghana Data Protection Act, 2012 (Act 843): consent capture, retention settings, and data-subject requests handled by anonymisation (financial records are retained).
