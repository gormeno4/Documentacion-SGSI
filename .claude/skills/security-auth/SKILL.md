---
name: security-auth
description: Standards for authentication and HTTP security including the dual-token JWT architecture with rotation and theft detection, bcrypt password hashing, and the ordered Express security middleware stack with Helmet, CORS, rate limiting, HPP, and body-size limits. Use this whenever implementing or reviewing login, logout, token issuance or refresh, session handling, password hashing, or the global security configuration in app.ts, even when the user only mentions auth or security loosely.
---

# Security and Authentication (JWT 2026)

This skill encodes the official security standard. Apply it whenever auth or the global security configuration is involved. The model is a dual-token architecture with mandatory rotation.

## Dual-token architecture

- **Access token**: 15-minute expiration. Stored in **client memory** (a JS variable), never in localStorage or a readable cookie.
- **Refresh token**: 7-day expiration. Stored in an **httpOnly + Secure + SameSite Strict** cookie.

## Rotation and theft detection

- Each use of a refresh token issues a **new** refresh token (rotation).
- If a revoked (already-used) refresh token is presented again, treat it as theft: **invalidate all of that user's sessions** immediately.

Implement rotation and theft detection in the services layer, not the controller.

## Password hashing

Hash passwords with **bcryptjs** using a cost factor of **12 or higher**. Never store or log plaintext passwords.

## Security middleware order in app.ts

Apply these in exactly this order. Order matters, so do not reorder them:

1. `trust proxy` — only if running behind a load balancer.
2. `securityHeaders` (Helmet) — NEVER include `'unsafe-inline'`.
3. `corsMiddleware` — allowed origins defined via environment variables, never hardcoded.
4. `rateLimiter` — default 100 requests per 15 minutes.
5. `hpp()` — HTTP Parameter Pollution protection.
6. `express.json({ limit: "10kb" })` — body-size limit. Allow up to 50mb only on specific routes that accept image or file uploads.

```ts
// app.ts (order is intentional)
if (behindProxy) app.set("trust proxy", 1);
app.use(securityHeaders());          // Helmet, no 'unsafe-inline'
app.use(corsMiddleware());           // origins from env
app.use(rateLimiter());              // 100 / 15 min
app.use(hpp());
app.use(express.json({ limit: "10kb" }));
```

## Logging

Use **Pino** for fast JSON logging, and redact sensitive fields (passwords, tokens) so they never reach the logs.

## Review checklist

When reviewing auth or security code, confirm:

- Access token lives in memory, refresh token in an httpOnly + Secure + SameSite Strict cookie.
- Refresh rotation is in place and reusing a revoked token kills all sessions.
- bcrypt cost factor is 12 or higher.
- Helmet has no `'unsafe-inline'`; CORS origins come from env.
- Body limit is 10kb except on explicit upload routes.
