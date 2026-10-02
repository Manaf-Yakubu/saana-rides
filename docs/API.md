# API

The live OpenAPI spec is served at `http://localhost:4000/docs` (JSON at `/docs-json`).

- Business routes are prefixed with `/v1`. `/health` is not prefixed.
- Authentication uses a Bearer JWT access token (15 min) plus an opaque rotating refresh token (30 days).
- Every route is denied unless it is marked `@Public()` or declares an `@Authorize(...)` policy.
- Request bodies are validated with the shared Zod schemas; unknown fields are rejected with 400.

## Auth flows

| Who                | Steps                                                                                                                                                                          |
| ------------------ | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| Management / Staff | `POST /v1/auth/login` -> `mfaToken` (5 min). First time: `POST /v1/auth/mfa/enroll` (returns secret + otpauth URI). Then `POST /v1/auth/mfa/verify` with a TOTP code -> tokens |
| Driver / Passenger | `POST /v1/auth/otp/request` (always 202) -> SMS code -> `POST /v1/auth/otp/verify` -> tokens                                                                                   |
| Everyone           | `POST /v1/auth/refresh` rotates the refresh token; `POST /v1/auth/logout` revokes the session; `GET /v1/auth/me` returns the current user                                      |

- Money fields are serialised as **strings of integer pesewas**, e.g. `"125000"` = GHS 1,250.00.
- Requests that create payments must send an `Idempotency-Key` header.
