# Security

The full threat model will be completed during Phase 1. It covers payment fraud, privilege escalation, webhook spoofing and driver location privacy.

## Baseline (in place)

- `helmet` security headers, a strict CORS allow-list from `CORS_ORIGINS`, and no `x-powered-by` header on the web app.
- Logs redact authorization headers, cookies, passwords and OTPs.
- Secrets live only in the environment. `.env.example` lists the variables; `.env` files are gitignored.
- CI runs `pnpm audit` (high and above), gitleaks secret scanning and Dependabot.

## Planned (Phase 1)

- argon2id passwords, mandatory TOTP for Management and Staff, phone OTP for drivers.
- Rotating refresh tokens with reuse detection.
- RBAC + ownership policy guards that deny by default.
- AES-256-GCM field encryption (Ghana Card), with a blind index for lookups.
- Private document bucket served through short-lived signed URLs, with access logging.
- Insert-only audit log enforced by a DB trigger.
- Ghana Data Protection Act, 2012 (Act 843): consent capture, retention settings, and data-subject requests handled by anonymisation (financial records are retained).
