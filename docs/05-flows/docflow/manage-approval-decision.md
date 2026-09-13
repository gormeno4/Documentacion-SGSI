---
id: FLOW-DOCFLOW-005
type: flow
domain: DOM-DOCFLOW
name: Gestionar decisión de aprobación
entryPoint: "/doc-flow/inbox → revisión de un step pendiente"
frontend:
  route: /doc-flow/inbox
  pages:
    - app/(menu)/doc-flow/inbox/page.tsx
    - app/(menu)/doc-flow/inbox/review/[processId]/[stepId]/page.tsx
    - app/(menu)/doc-flow/inbox/[versionId]/[processId]/[stepId]/page.tsx
  components:
    - components/functional/doc-flow/inbox/index.tsx
    - components/functional/doc-flow/inbox/entity-review-view.tsx
    - components/functional/doc-flow/inbox/document-review-view.tsx
    - components/functional/doc-flow/inbox/ReviewActionBar.tsx
    - components/functional/doc-flow/ReassignApproverDialog.tsx
  stores:
    - store/zustand/docFlowStore.ts
  services:
    - store/services/doc-flow.Service.ts
technical:
  endpoints:
    - { action: "aprobar el step activo", ref: EP-DOCFLOW-APPROVE-STEP }
    - { action: "rechazar el step activo", ref: EP-DOCFLOW-REJECT-STEP }
    - { action: "reasignar el aprobador de un step pendiente", ref: EP-DOCFLOW-REASSIGN-STEP }
status: CONFIRMED
externalDependencies:
  - domain: email
    reason: "aprobar notifica al siguiente aprobador o al publicador si no queda ninguno; rechazar notifica al editor/creador; reasignar notifica al nuevo aprobador si su step queda activo."
---

# Gestionar decisión de aprobación

## Propósito
Que un aprobador asignado decida sobre el step que le corresponde (aprobar o rechazar), o que un administrador reasigne un step pendiente a otra persona — las tres acciones comparten exactamente el mismo contexto de revisión (misma pantalla, mismo proceso/step).

## Entrada desde UI
`/doc-flow/inbox` (bandeja) → `document-review-view.tsx` (entity_type='DOCUMENT') o `entity-review-view.tsx` (cualquier otro entity_type, con previews específicos por tipo) → `ReviewActionBar.tsx` (aprobar/rechazar) / `ReassignApproverDialog.tsx` (reasignar).

## Flujo funcional
1. El aprobador revisa el snapshot enviado (ver `FLOW-DOCFLOW-010`) y decide: `approveStep` (`EP-DOCFLOW-APPROVE-STEP`) — exige que sea su step, esté `PENDIENTE`, y no haya un revisor anterior aún pendiente (orden secuencial); si era el último step pendiente de la iteración, el proceso pasa a `PENDIENTE_PUBLICAR`.
2. `rejectStep` (`EP-DOCFLOW-REJECT-STEP`) — exige justificación no vacía; marca el step `RECHAZADO`, los demás `PENDIENTE` de esa iteración como `NO_APLICA`, el proceso pasa a `DEVUELTO` con `current_iteration + 1`, y clona los mismos revisores como nuevos steps `PENDIENTE` de la nueva iteración.
3. `reassignStep` (`EP-DOCFLOW-REASSIGN-STEP`, solo admin) — cambia el `user_id` de un step `PENDIENTE`; si ese step era el activo, notifica al nuevo aprobador.
4. Notificaciones fire-and-forget según el caso (siguiente aprobador, publicador si no queda ninguno, editor si se rechazó, nuevo aprobador si se reasignó al step activo).

## Frontend
`entity-review-view.tsx` / `document-review-view.tsx` → `useDocFlow()` → `docFlowStore`.

## API
`POST .../steps/:stepId/approve`, `POST .../steps/:stepId/reject`, `POST /document-flow/steps/:stepId/reassign` — acceso `admin-or-usuario` (reasignar exige además `isSystemAdmin`/`hasAdminRole` en el controller).

## Backend
`routers/doc-flow.ts` → `controllers/doc-flow.ts` (`handleApproveStep`, `handleRejectStep`, `handleReassignStep`) → `models/doc-flow.ts` (`approveStep`, `rejectStep`, `reassignStep`) → `queries/doc-flow.ts`.

## Database
`sgsi.doc_flow_approve_step` (`:684-770`), `sgsi.doc_flow_reject_step` (`:2629-2746`), `sgsi.doc_flow_reassign_step` (variante 3 args, `:2555-2624`, valida pertenencia de la entidad al cliente vía `FN-DOC-FLOW-ENTITY-BELONGS-TO-CUSTOMER` y que el nuevo aprobador pertenezca al cliente).

## Reglas relevantes
- Orden secuencial estricto: no se puede aprobar/rechazar si hay un revisor de menor `step_order` aún pendiente en la misma iteración.
- Existe un overload de 2 args de `doc_flow_reassign_step` (sin `p_customer_id`) inalcanzable desde Node.
- Reasignar solo aplica a steps `PENDIENTE`.

## Consideraciones
- **Fusión validada (Checkpoint B/C)**: aprobar, rechazar y reasignar comparten el mismo contexto de revisión (mismos componentes `entity-review-view.tsx`/`document-review-view.tsx`) — se modelan como una sola Operación con 3 acciones, no 3 Operaciones separadas.
- `document-review-view.tsx` vs. `entity-review-view.tsx` es una bifurcación puramente de presentación (con previews por tipo de entidad en `entity-review-view/previews/*`) — ambas caen en los mismos 3 endpoints.

## Trazabilidad
```mermaid
flowchart LR
  UI["entity-review-view.tsx / document-review-view.tsx\n/doc-flow/inbox/..."] --> SVC["doc-flow.Service.ts"]
  SVC --> API1["POST .../approve"]
  SVC --> API2["POST .../reject"]
  SVC --> API3["POST /document-flow/steps/:id/reassign"]
  API1 --> FN1["sgsi.doc_flow_approve_step"] --> T1[("sgsi.document_flow_steps")]
  API2 --> FN2["sgsi.doc_flow_reject_step"] --> T1
  API3 --> FN3["sgsi.doc_flow_reassign_step"] --> T1
  FN1 --> T2[("sgsi.document_flow_processes")]
  FN2 --> T2
  API1 -.->|fire-and-forget| EXT["email"]
  API2 -.->|fire-and-forget| EXT
  API3 -.->|fire-and-forget| EXT
```
