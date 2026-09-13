---
id: FLOW-CTX-003
type: flow
domain: DOM-CTX
name: Gestionar Análisis PESTEL
entryPoint: "/context-scope/pestel (pantalla principal); consultada también en modo lectura desde /context-scope/organizational-context"
frontend:
  route: /context-scope/pestel
  pages:
    - app/(menu)/context-scope/pestel/page.tsx
    - app/(menu)/context-scope/organizational-context/page.tsx
  components:
    - components/functional/context-scope/pestel/pestel.tsx
    - components/functional/context-scope/pestel/political.tsx
    - components/functional/context-scope/pestel/economic.tsx
    - components/functional/context-scope/pestel/social.tsx
    - components/functional/context-scope/pestel/technological.tsx
    - components/functional/context-scope/pestel/ecological.tsx
    - components/functional/context-scope/pestel/legal.tsx
    - components/functional/context-scope/pestel/pestel-editor.tsx
    - components/functional/context-scope/pestel/pestel-history.tsx
    - components/functional/context-scope/pestel/pestel-version-modal.tsx
    - components/functional/context-scope/pestel/pestel-rejection-card.tsx
    - components/functional/context-scope/organizational-context/organizational-context.tsx
  stores:
    - store/zustand/pestelStore.ts
  services:
    - store/services/pestel.Service.ts
technical:
  endpoints:
    - { action: "consultar ítems PESTEL", ref: EP-PESTEL-GET-BY-CUSTOMER-ID }
    - { action: "guardar ítem (una de las 6 dimensiones)", ref: EP-PESTEL-UPSERT }
    - { action: "eliminar ítem", ref: EP-PESTEL-DELETE-BY-ID }
    - { action: "consultar cabecera del análisis activo", ref: EP-PESTEL-ANALYSIS-GET-BY-CUSTOMER-ID }
    - { action: "marcar análisis como completo", ref: EP-PESTEL-ANALYSIS-MARK-COMPLETE }
    - { action: "crear nueva versión", ref: EP-PESTEL-ANALYSIS-CREATE-NEW-VERSION }
    - { action: "publicar (rama local, ver Consideraciones)", ref: EP-PESTEL-ANALYSIS-PUBLISH }
    - { action: "consultar historial de versiones", ref: EP-PESTEL-ANALYSIS-GET-VERSIONS }
    - { action: "consultar una versión puntual", ref: EP-PESTEL-ANALYSIS-GET-VERSION-BY-ID }
    - { action: "consultar catálogo de sugerencias PESTEL", ref: EP-BASE-PESTEL-GET-ALL }
status: CONFIRMED
externalDependencies:
  - domain: doc-flow
    reason: "envío a aprobación (FLOW-DOCFLOW-004, entity_type=PESTEL), publicación real (FLOW-DOCFLOW-006 flipea is_active+is_complete) e historial (FLOW-DOCFLOW-010)."
---

# Gestionar Análisis PESTEL

## Propósito
Evaluar factores Políticos, Económicos, Sociales, Tecnológicos, Ecológicos y Legales del entorno del cliente como ítems agrupados en un análisis versionado (`sgsi.pestel_analysis`), asistido por un catálogo de sugerencias precargadas.

## Entrada desde UI
`/context-scope/pestel` es la única pantalla que edita PESTEL. `/context-scope/organizational-context` la consulta en modo 100% lectura — no es una entrada de edición (ver Consideraciones).

## Flujo funcional
1. Carga de ítems, cabecera y catálogo de sugerencias (`getByCustomerId`/`getAnalysis`/`getAll` → `EP-PESTEL-GET-BY-CUSTOMER-ID`/`EP-PESTEL-ANALYSIS-GET-BY-CUSTOMER-ID`/`EP-BASE-PESTEL-GET-ALL`); auto-siembra del análisis al primer guardado.
2. El usuario agrega/edita ítems en las 6 dimensiones → `upsert` → `EP-PESTEL-UPSERT`; puede eliminarlos (`EP-PESTEL-DELETE-BY-ID`).
3. `markComplete` → `EP-PESTEL-ANALYSIS-MARK-COMPLETE`.
4. Envío a aprobación: `/doc-flow/configuration?type=PESTEL&entityId=<analysisId>` (`FLOW-DOCFLOW-004`).
5. Publicación: Doc-Flow primero (flip real), luego `EP-PESTEL-ANALYSIS-PUBLISH` (no-op en la práctica, mismo patrón que FODA).
6. Historial: `getVersions`/`getVersionById`, enriquecido con `getProcessByEntity('PESTEL', ...)`.
7. Nueva versión: `createNewVersion` → `EP-PESTEL-ANALYSIS-CREATE-NEW-VERSION`.

## Frontend
`pestel.tsx` → `usePestel()`/`useBasePestel()` → `pestelStore` → `pestel.Service.ts`. `organizational-context.tsx` también usa `usePestel()`, solo lectura.

## API
`GET /pestel/getByCustomerId`, `POST /pestel/upsert`, `DELETE /pestel/deleteById/:id`, `GET /pestel/analysis`, `POST /pestel/analysis/complete`, `POST /pestel/analysis/new-version`, `POST /pestel/analysis/publish`, `GET /pestel/analysis/versions`, `GET /pestel/analysis/version/:id`, `GET /base-pestel/getAll` — acceso `admin-or-usuario`, salvo `base-pestel` que está montado como `admin-only` (asimetría real, ver Hallazgos).

## Backend
`routers/pestel.ts` + `routers/basePestel.ts` → `controllers/pestel.ts`/`basePestel.ts` → `models/pestel.ts`/`basePestel.ts` → `sgsi.v2_pestel_*`/`v2_base_pestel_get_all`.

## Database
`sgsi.v2_pestel_get_by_customer_id`, `v2_pestel_upsert`, `v2_pestel_delete_by_id`, `v2_pestel_analysis_get_by_customer_id`, `v2_pestel_analysis_mark_complete`, `v2_pestel_analysis_create_new_version`, `v2_pestel_analysis_publish`, `v2_pestel_analysis_get_versions`, `v2_pestel_analysis_get_version_by_id`, `v2_base_pestel_get_all` (`funciones_sgsi.sql`). Tablas: `sgsi.pestel`, `sgsi.pestel_analysis`, `sgsi.base_pestel` (catálogo, solo lectura).

## Consideraciones
- **Contexto Organizacional no es Operación propia** — mismo criterio que FODA (`FLOW-CTX-002`).
- **Redundancia de publicación (Technical Debt)**: mismo patrón que FODA — `FN-V2-PESTEL-ANALYSIS-PUBLISH` queda no-op tras el flip real de Doc-Flow. No corregido.
- `EP-BASE-PESTEL-GET-ALL` es el único endpoint de todo `DOM-CTX` montado como `admin-only` (el resto es `admin-or-usuario`) — asimetría real, no corregida.

## Trazabilidad
```mermaid
flowchart LR
  UI["pestel.tsx\n/context-scope/pestel"] --> SVC["pestel.Service.ts"]
  SVC --> API1["POST /pestel/upsert"]
  API1 --> CTRL["controllers/pestel.ts#upsert"]
  CTRL --> MDL["models/pestel.ts#upsert"]
  MDL --> FN1["sgsi.v2_pestel_upsert()"]
  FN1 --> T1[("sgsi.pestel")]
  FN1 -.->|auto-siembra| T2[("sgsi.pestel_analysis")]
```
