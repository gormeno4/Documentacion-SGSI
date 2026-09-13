---
name: Inbox SGSI Convergences
description: Convergence mapping to existing FLOW-DOCFLOW operations and DOM-RSK visualization
---

# Convergencias — Inbox SGSI

Inbox SGSI converge exclusivamente a operaciones existentes documentadas. No posee operaciones propias.

## Convergencias Operacionales → FLOW-DOCFLOW

### EDITOR → Editar Documento

```
Inbox UI:
  InboxList.tsx
    → handleAction(task) where inbox_role === "EDITOR"
    → router.push(`/doc-flow/edition/${task.entity_version_id}`)

Destino:
  /doc-flow/edition/[id]
    → document-editor-view.tsx
    → FLOW-DOCFLOW-003

Operación real:
  FLOW-DOCFLOW-003: Editar contenido de documento
  Endpoint: EP-DOC-UPDATE-CONTENT (y otros de edición)
  Owner: DOM-DOCFLOW
  
Clasificación:
  NAVEGACIÓN PURA → OPERACIÓN EXISTENTE
```

### APPROVER → Revisar y Decidir

```
Inbox UI:
  InboxList.tsx
    → handleAction(task) where inbox_role === "APPROVER"
    
Dos ramas:
  if entity_type === "DOCUMENT":
    → router.push(`/doc-flow/inbox/${task.entity_version_id}/${task.process_id}/${task.step_id}`)
  else:
    → router.push(`/doc-flow/inbox/review/${task.process_id}/${task.step_id}`)

Destino:
  /doc-flow/inbox/review/[processId]/[stepId] OR
  /doc-flow/inbox/[versionId]/[processId]/[stepId]
    → entity-review-view.tsx OR document-review-view.tsx
    → FLOW-DOCFLOW-005

Operación real:
  FLOW-DOCFLOW-005: Gestionar decisión de aprobación
  Endpoints:
    - EP-DOCFLOW-APPROVE-STEP
    - EP-DOCFLOW-REJECT-STEP
    - EP-DOCFLOW-REASSIGN-STEP
  Owner: DOM-DOCFLOW
  
Acciones disponibles en destino:
  1. Aprobar (POST .../steps/:stepId/approve)
  2. Rechazar (POST .../steps/:stepId/reject)
  3. Reasignar (POST /document-flow/steps/:stepId/reassign)
  
Clasificación:
  NAVEGACIÓN PURA → OPERACIÓN EXISTENTE
```

### PUBLISHER → Publicar Documento

```
Inbox UI:
  InboxList.tsx
    → handleAction(task) where inbox_role === "PUBLISHER"
    → router.push(`/doc-flow/inbox`)

Destino:
  /doc-flow/inbox (bandeja de DocFlow)
    → inbox-list.tsx (de doc-flow, NO de inbox-sgsi)
    → FLOW-DOCFLOW-006

Operación real:
  FLOW-DOCFLOW-006: Publicar documento/entidad
  Endpoint: EP-DOCFLOW-PUBLISH-PROCESS
  Owner: DOM-DOCFLOW
  
Clasificación:
  NAVEGACIÓN PURA → OPERACIÓN EXISTENTE
```

## Convergencia de Lectura → DOM-RSK

### Matriz de Riesgos Operacionales

```
Inbox UI:
  InboxSgsi.tsx
    → <OperativeRiskMatrix operativeRiskMatrix={operativeRiskMatrix} />
    → Visualización pura (sin eventos click en Inbox)

Datos de:
  GET /inbox/activity
    → sgsi.v2_inbox_main_get()
      → sgsi.get_operative_risk_matrix() [si user es group_owner]
        → sgsi.v2_asset_group_threat_risk_get_scenarios()

Fuente:
  sgsi.asset_group (owned by user as owner_person_id)
  sgsi.probability_impact_level
  
Operación real:
  Lectura pura, no hay FLOW
  Datos vienen de riesgo management (DOM-RSK)
  
Clasificación:
  VISUALIZACIÓN DE LECTURA → INFORMACIÓN DE DOM-RSK
```

## Convergencias de Entity Types

Inbox muestra actividades de múltiples dominios que atraviesan el flujo documental:

| entity_type | Dominio propietario | Converge a | Contexto |
|---|---|---|---|
| DOCUMENT | DOM-DOCFLOW | FLOW-DOCFLOW-* | Documentos SGSI |
| STAKEHOLDER | DOM-STK | FLOW-DOCFLOW-004/005/006 | Partes interesadas en proceso |
| SCOPE | DOM-CTX | FLOW-DOCFLOW-004/005/006 | Alcance en proceso |
| KPI | DOM-CTX | FLOW-DOCFLOW-004/005/006 | KPIs en proceso |
| STRATEGIC_OBJECTIVE | DOM-CTX | FLOW-DOCFLOW-004/005/006 | Objetivos en proceso |
| PESTEL | DOM-CTX | FLOW-DOCFLOW-004/005/006 | PESTEL en proceso |
| FODA | DOM-CTX | FLOW-DOCFLOW-004/005/006 | FODA en proceso |
| EXECUTIVE_SUMMARY | DOM-CTX | FLOW-DOCFLOW-004/005/006 | Resumen en proceso |
| COMMUNICATIONS_MATRIX | DOM-GOV | FLOW-DOCFLOW-004/005/006 | Comunicaciones en proceso |
| ACTIVO_INFORMACION | DOM-ACT | FLOW-DOCFLOW-004/005/006 | Activos en proceso |
| CARGO | DOM-GOV | FLOW-DOCFLOW-004/005/006 | Cargos en proceso |
| INITIATIVE | DOM-INIT | FLOW-DOCFLOW-004/005/006 | Iniciativas en proceso |
| SOA | DOM-SOA | FLOW-DOCFLOW-004/005/006 | SOA en proceso |
| ORGANIGRAMA | DOM-GOV | FLOW-DOCFLOW-004/005/006 | Organigrama en proceso |
| RISK_TREATMENT_PLAN | DOM-RSK | FLOW-DOCFLOW-004/005/006 | Planes en proceso |

**Nota:** No son convergencias operacionales (Inbox no ejecuta operaciones de esos dominios). Son entidades que atraviesan el flujo documental y aparecen como tareas en la bandeja.

## No convergencias

**Categorías UI sin consumidor:**
- "Incidentes" (deshabilitado en filtro)
- "Capacitaciones" (deshabilitado en filtro)

Estas categorías no tienen entity_type correspondiente en `inbox_get_main_activity()` y retornan 0 items.

## Resumen de Responsabilidades

| Responsabilidad | Propietario | Inbox |
|---|---|---|
| Crear documento | DOM-DOCFLOW | Navega a entrada de creación |
| Editar documento | DOM-DOCFLOW | Navega a editor |
| Enviar a aprobación | DOM-DOCFLOW | Navega a aprobación |
| Aprobar/Rechazar | DOM-DOCFLOW | Navega a vista de decisión |
| Publicar | DOM-DOCFLOW | Navega a bandeja de publicación |
| Gestionar riesgos | DOM-RSK | Visualiza matriz solo |
| Listar actividades | Inbox | Responsabilidad propia (lectura) |
| Agregar datos transversales | Inbox | Responsabilidad propia (lectura) |

---

**Status:** Convergencias completamente trazadas y documentadas en PHASE 2/3.

**No hay operaciones propias de Inbox.**
