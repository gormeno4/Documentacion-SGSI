---
name: backend-architecture
description: Standards and step-by-step workflow for building Node.js and Express backend code using the layered Router to Middleware to Controller to Service to Model to Query to Database pattern, with thin controllers and business logic isolated in the services layer. Use this whenever creating or editing routers, controllers, services, models, queries, middlewares, schemas, or the app and server entrypoints in this codebase, or when reviewing backend code for separation-of-concerns compliance, even if the user does not name the layers explicitly.
---

# Backend Architecture (Node.js / Express)

This skill encodes the official backend standard. The backend layer is focused on Security and Separation of Concerns. The guiding rule is that controllers stay thin (HTTP handling only) and all business logic lives exclusively in the services layer.

## The layered flow

Every request travels through these layers in order:

```text
Router → Middleware → Controller → Service → Model → Query → Database
```

Each layer has one job:

- **routers/** (the traffic police) map URLs to specific controllers. No logic.
- **middlewares/** (the metal detector) block or translate requests (auth, rate limiting, Pino logging).
- **controllers/** (the receptionist) extract data from `req.body` / `req.params`, run basic validation, and delegate to the service. Controllers must NOT contain business logic.
- **services/** (the chef) hold all business logic, calculations, and complex orchestration. This is the only place the "magic" happens.
- **models/** (the connector) own the actual database connection via the Pool.
- **queries/** (the spell dictionary) store raw parameterized SQL, keeping SQL out of the rest of the code.
- **schemas/** (the manual) hold validation schemas.
- **config/** centralizes configuration through `requireEnv()`.
- **app.ts** (the heart) holds global security settings.
- **server.ts** (the ignition key) starts the engine and listens on the configured port.

## Thin controllers, fat services

A controller should read like a short list of steps with no branching business rules:

```ts
// controllers/audit.controller.ts
export const createAudit = async (req, res, next) => {
  try {
    const dto = auditSchema.parse(req.body);   // basic validation only
    const result = await auditService.create(dto); // delegate everything
    res.status(201).json(result);
  } catch (err) {
    next(err);
  }
};
```

If you find yourself writing calculations, dependency checks, or multi-step orchestration in a controller, move it into a `services/` function. When reviewing code, flag any controller that contains business rules.

## Validation engine

Pick the engine by project:

- **Barnard-SGSI**: use **Joi** for backend request validation.
- **All other / new projects**: use **Zod** for backend validation.

Validate in the controller (or a validation middleware) before delegating to the service. Malformed payloads must be rejected with a clean error structure and must never expose internal server traces.

## Config and entrypoints

- Read every environment variable through a centralized `requireEnv()` in `config/` so a missing variable fails fast at startup, never silently at runtime.
- Keep `app.ts` limited to wiring and global security (see the security-auth skill for the exact middleware order). Keep `server.ts` limited to starting the listener.

## Naming

- Hooks, functions, and logic use `camelCase` (`validateUser()`).
- Project root folders use `kebab-case` (`api-service-v1/`).
- Database columns use `snake_case` (`user_id`, `created_at`).
- Environment variables use `SCREAMING_SNAKE` (`JWT_ACCESS_SECRET`).

## Build workflow

1. Define the validation schema in `schemas/` (Joi for Barnard-SGSI, Zod otherwise).
2. Add the raw parameterized SQL in `queries/` (see the database-postgres skill).
3. Implement the business logic in `services/`.
4. Wire a thin controller that validates, delegates, and shapes the HTTP response.
5. Map the route in `routers/` and attach the needed middlewares.

## Related skills

- For JWT, sessions, and the ordered security middleware stack in `app.ts`, use the **security-auth** skill.
- For SQL, soft deletes, state machines, and JSONB, use the **database-postgres** skill.
- For unit testing the services layer, use the **testing-vitest** skill.
