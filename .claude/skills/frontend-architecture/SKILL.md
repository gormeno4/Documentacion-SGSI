---
name: frontend-architecture
description: Standards and step-by-step workflow for building React and Next.js frontend code following the Component to Hook to Service to Zustand pattern, premium UI tokens, and form resilience rules. Use this whenever creating or editing React or Next.js components, hooks, services, Zustand stores, interfaces, forms, or tables in this codebase, even when the user does not explicitly mention the architecture. Also use when reviewing frontend code for compliance with the dumb-component and orchestrator-hook conventions.
---

# Frontend Architecture (React / Next.js)

This skill encodes the official frontend standard for this ecosystem. The frontend layer is focused on User Experience and Performance. The guiding idea is that the UI stays "dumb" (presentational) while a Hook holds the "brain" (logic and orchestration).

## The core layering rule

Build every feature along this one-directional flow:

```text
Component  →  Hook (Orchestrator)  →  Service  →  Zustand (State)
```

Responsibilities are strict and non-overlapping:

- **Component** is presentational only. It receives data and callbacks as props and renders. It does not call APIs, does not own business logic, and does not read global state directly when a hook can provide it.
- **Hook** is the orchestrator and the only place where business logic, loading states, and orchestration live. It calls services, coordinates Zustand, and exposes a clean interface to the component.
- **Service** holds pure API-fetching logic (Axios or Fetch) and nothing else. No UI concerns, no global-state mutation.
- **Zustand** is the global "source of truth" for shared state.

When you are asked to "add a feature" or "wire up a screen", do not collapse these layers into one component. Push logic up into a hook even for seemingly small cases, because that is what keeps components reusable and testable.

## Directory placement

Place files exactly here under `/src`:

```text
app/                      Next.js App Router (routes and layouts)
components/
  functional/             Logic-heavy orchestrator components
  layout/                 Structural skeletons (Headers, Sidebars)
  ui/                     Atomic CVA-based components (Buttons, Inputs)
store/
  hooks/                  The orchestrators - business logic and loading states
  services/               Pure API fetching logic (Axios / Fetch)
  zustand/                Global state, the source of truth
  interfaces/             Strict TypeScript data contracts
```

## Hard limits and naming

- **Avoid God Components.** A component over 800 lines is a defect. If a functional component approaches this, extract logic into hooks and split the view into smaller `ui/` or `layout/` pieces.
- **Naming** (see also the project naming standard):
  - Components and UI files use `PascalCase` (for example `RiskMatrix.tsx`).
  - Hooks, functions, and logic use `camelCase` (for example `useAuditData()`, `validateUser()`).
- Every data shape crossing a layer boundary must have a strict TypeScript contract in `store/interfaces/`. Do not pass untyped objects between hook and service.

## Validation engine

Use **Zod** for frontend schema validation in **all** projects, including Barnard-SGSI. (Barnard-SGSI differs only on the backend, where it uses Joi. New and all other projects use Zod on both ends.) Validate user input against a Zod schema in the hook layer before any service call leaves the client.

## Build workflow

Follow these steps when implementing a frontend feature:

1. Define or update the TypeScript contracts in `store/interfaces/` for the data involved.
2. Create the `store/services/` function that performs the raw API call and returns typed data.
3. Create the `store/hooks/` orchestrator that calls the service, owns `isLoading` / `isSubmitting`, validates input with Zod, and updates the Zustand store.
4. Build the presentational component in `components/functional/` (or `ui/` for atomic pieces) that consumes only the hook's returned interface.
5. Apply the premium UI standard and the form resilience standard (see references below).

## When to read the reference files

This skill keeps two detailed standards in separate files so they only load when needed:

- For visual and styling rules (design tokens, CVA variants, micro-animations, loading UX, responsive strategy), read `references/premium-ui.md`.
- For any screen that submits data or contains a form (input validation, mutation lockdown, keyboard handling, error layout stability, guaranteed state release), read `references/form-resilience.md`.

Read the relevant reference file before writing the corresponding code, not after.
