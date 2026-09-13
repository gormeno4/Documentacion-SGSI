---
name: testing-vitest
description: Standards and workflow for writing Vitest unit and integration tests for the services layer, covering the happy path plus malformed payloads, validation error structures, and ensuring internal traces are never exposed. Use this whenever writing, updating, or reviewing tests for backend services, validation behavior, or edge cases, or when a user story or acceptance criteria needs test coverage, even if the user just says add tests.
---

# Testing Strategy and QA (Vitest)

This skill encodes the official testing standard. Code quality is not optional, so every new feature must prove stability before reaching production. Tests use Vitest (fast, TypeScript-native).

## What must be tested

- **Services layer is mandatory.** Since business logic lives exclusively in `services/`, every critical service must have comprehensive unit tests.
- **Edge cases are mandatory, not just the happy path.** Test behavior against malformed payloads and verify that the validation engine (Zod or Joi) responds with the correct error structure and never exposes internal server traces.
- **Align tests to acceptance criteria.** Write unit and integration tests directly from the acceptance criteria defined by QA or the Product Owner for each user story, not from your own assumptions.

## Test file shape

Mirror the service under test and cover both paths explicitly:

```ts
import { describe, it, expect, vi } from "vitest";
import { auditService } from "./audit.service";

describe("auditService.create", () => {
  it("creates an audit for a valid payload (happy path)", async () => {
    const result = await auditService.create(validDto);
    expect(result.id).toBeDefined();
  });

  it("rejects a malformed payload with a clean validation error", async () => {
    await expect(auditService.create(malformedDto))
      .rejects.toMatchObject({ name: "ValidationError" });
  });

  it("never leaks internal stack traces in the error", async () => {
    try {
      await auditService.create(malformedDto);
    } catch (err) {
      expect(JSON.stringify(err)).not.toMatch(/at .*\(.*:\d+:\d+\)/);
    }
  });
});
```

## Workflow

1. Read the user story and its acceptance criteria first; turn each criterion into one or more test cases.
2. Write happy-path tests for the service.
3. Add edge-case tests for malformed payloads, asserting the exact validation error structure.
4. Add an assertion that no internal trace is exposed in the error response.
5. Run the suite and confirm coverage of the critical services before considering the feature done.

## Review checklist

- Critical services have unit tests.
- Malformed-payload cases exist and assert the validation error structure.
- No test passes while internal traces leak to the client.
- Test cases trace back to specific acceptance criteria.
