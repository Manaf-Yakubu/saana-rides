# API

The live OpenAPI spec is served at `http://localhost:4000/docs` (JSON at `/docs-json`).

- Business routes are prefixed with `/v1`. `/health` is not prefixed.
- Authentication uses a Bearer JWT access token, with a rotating refresh token (slice 2).
- Money fields are serialised as **strings of integer pesewas**, e.g. `"125000"` = GHS 1,250.00.
- Requests that create payments must send an `Idempotency-Key` header.
