---
name: database-postgres
description: Standards for PostgreSQL data access and integrity including absolute positional parameterization, soft deletes with dependency validation, unbreakable state machines, validated JSONB payloads, and keeping business logic out of the database. Use this whenever writing or reviewing SQL queries, models, soft-delete logic, status transitions, JSONB columns, or PL/pgSQL functions and triggers in this codebase, even if the user only mentions the database or a query loosely.
---

# Logical Security and Database Integrity (PostgreSQL)

This skill encodes the official database standard. Enterprise data integrity is non-negotiable, so the database and core logic must reject destructive or inconsistent operations.

## 1. Absolute parameterization

All raw queries in `queries/` must use positional parameters only (`$1`, `$2`). String concatenation and template literals to inject variables into SQL are strictly forbidden, because they open SQL injection paths.

```ts
// Wrong - template literal injection
const q = `SELECT * FROM users WHERE id = ${userId}`;

// Right - positional parameter
const q = "SELECT * FROM users WHERE id = $1";
await pool.query(q, [userId]);
```

## 2. Soft deletes with dependency validation

- Physical deletion (hard delete) of critical information is strictly prohibited.
- Implement soft deletes (for example `is_active = false`).
- Before soft-deleting, the services layer must verify there are no linked records. If dependencies exist, abort the action instead of deleting.

```ts
// services layer
const deps = await repo.countDependents(id);
if (deps > 0) throw new ConflictError("Record has linked dependencies");
await repo.softDelete(id); // sets is_active = false
```

## 3. Unbreakable state machines

Multi-stage entity workflows (for example Position documents) must be enforced at the backend level:

- Entities must initialize in their defined base state (for example `Draft`).
- The services layer must block any attempt to jump directly to an advanced state (for example "In Revision") that bypasses required intermediate steps.

Never trust a client-supplied status to set state directly; validate the transition against the allowed graph in the service.

## 4. Validated JSONB

When using `jsonb` columns for dynamic storage, validate every incoming payload against a defined schema before insertion (Joi for Barnard-SGSI, Zod for other projects). This prevents structural injection into the document.

## 5. Zero hidden logic in the database

Native database functions (PL/pgSQL) and triggers are limited to integrity validations, audit logs, and large aggregation calculations. Complex business rules and orchestration must always live in the Node.js services layer, never hidden inside the database.

## Review checklist

- Every query uses `$1`, `$2` positional parameters with no concatenation.
- No hard deletes of critical data; soft deletes guarded by dependency checks.
- State transitions validated in services; entities start in their base state.
- JSONB payloads validated by schema before insert.
- No business logic buried in triggers or PL/pgSQL.
