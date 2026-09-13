---
type: component
name: Inbox SGSI
slug: inbox-sgsi
classification: TRANSVERSAL READ-ONLY AGGREGATOR + CONVERGENCE
route: /inbox-sgsi
status: TECHNICAL TRACEABILITY COMPLETE
summary: Bandeja transversal de actividades del usuario y visualización de matriz de riesgos operacionales. Todas las operaciones convergen a dominios existentes.
convergences:
  - DOM-DOCFLOW
  - DOM-RSK
---

# Inbox SGSI — Documentación Técnica

## Clasificación

**NO DOMAIN — NO FLOW — TRANSVERSAL READ-ONLY AGGREGATOR + CONVERGENCE**

Inbox SGSI es un agregador transversal que:
1. Centraliza actividades del usuario en el flujo documental (Bandeja)
2. Visualiza matriz de riesgos operacionales (para group_owners)
3. Navega a operaciones existentes en otros dominios

## Endpoints

| Endpoint | Consumer | Function | Purpose |
|---|---|---|---|
| [`EP-INBOX-GET-ACTIVITY`](endpoints/EP-INBOX-GET-ACTIVITY.yaml) | `/inbox-sgsi` | `sgsi.v2_inbox_main_get` | Fetch activities + risk matrix for inbox dashboard |
| [`EP-INBOX-GET-ENRICHED-ACTIVITY`](endpoints/EP-INBOX-GET-ENRICHED-ACTIVITY.yaml) | `/profile` (SecurityProfileSection) | `sgsi.v2_inbox_get_enriched_activity` | Fetch activity history for compliance/audit view |

**Access:** `admin-or-usuario` (authenticated users)

## Funciones SQL

### Principales (Endpoints)

- **[FN-INBOX-GET-MAIN](functions/FN-INBOX-GET-MAIN.yaml)** — `sgsi.v2_inbox_main_get(customer_id, user_id)`
  - Retorna JSONB con actividades + matriz de riesgos + metodología
  - Toma decisión condicional: calcula get_operative_risk_matrix si usuario es group_owner
  
- **[FN-INBOX-GET-ENRICHED](functions/FN-INBOX-GET-ENRICHED.yaml)** — `sgsi.v2_inbox_get_enriched_activity(customer_id, user_id)`
  - Filtra actividades a HISTORIAL solo
  - Enriquece con metadatos de área y tipo de documento

### Auxiliares (Helpers)

- **[FN-INBOX-ACTIVITY](functions/FN-INBOX-ACTIVITY.yaml)** — `sgsi.inbox_get_main_activity(customer_id, user_id)` [RETURNS TABLE]
  - SQL UNION de 6 conjuntos de queries
  - Trae tareas donde usuario tiene rol: EDITOR, APPROVER, PUBLISHER
  - Estados: PENDIENTE, REVISION, HISTORIAL
  - Soporta 15+ entity_types (DOCUMENT, STAKEHOLDER, SCOPE, KPI, ..., SOA, RISK_TREATMENT_PLAN)

- **[FN-INBOX-OPERATIVE-RISK-MATRIX](functions/FN-INBOX-OPERATIVE-RISK-MATRIX.yaml)** — `sgsi.get_operative_risk_matrix(customer_id, person_id)`
  - Calcula matrices 3x3 / 4x4 / 5x5 (alias)
  - Retorna JSONB con riskItems para visualización
  - Llamada por FN-INBOX-GET-MAIN si usuario es asset_group owner

## Convergencias Operacionales

Todas las acciones del usuario desde Inbox redirigen a operaciones existentes en **DOM-DOCFLOW**:

| Inbox Action | Ruta destino | FLOW ID | Operación |
|---|---|---|---|
| **EDITOR → Edit** | `/doc-flow/edition/{version_id}` | FLOW-DOCFLOW-003 | Editar contenido de documento |
| **APPROVER → Review/Approve** | `/doc-flow/inbox/review/{processId}/{stepId}` | FLOW-DOCFLOW-005 | Gestionar decisión de aprobación |
| **PUBLISHER → Publish** | `/doc-flow/inbox` | FLOW-DOCFLOW-006 | Publicar documento/entidad |

**Conclusión:** Inbox NO ejecuta ninguna operación propia. Solo navega hacia operaciones propietarias de DOM-DOCFLOW.

## Convergencias de Lectura

### Entity Types Soportados (vía FN-INBOX-ACTIVITY)

Inbox muestra actividades de múltiples dominios a través del flujo documental:

| Entity Type | Tabla fuente | Dominio propietario | Contexto |
|---|---|---|---|
| DOCUMENT | sgsi.doc_documents | DOM-DOCFLOW | Documentos SGSI |
| STAKEHOLDER | sgsi.stake_holder_analysis | DOM-STK | Partes interesadas en flujo |
| SCOPE | sgsi.scope | DOM-CTX | Alcance en flujo |
| KPI | sgsi.kpi_analysis | DOM-CTX | KPIs en flujo |
| STRATEGIC_OBJECTIVE | sgsi.strategic_objective_analysis | DOM-CTX | Objetivos en flujo |
| PESTEL | sgsi.pestel_analysis | DOM-CTX | PESTEL en flujo |
| FODA | sgsi.foda_analysis | DOM-CTX | FODA en flujo |
| EXECUTIVE_SUMMARY | sgsi.executive_summary | DOM-CTX | Resumen en flujo |
| COMMUNICATIONS_MATRIX | sgsi.communications_matrix_analysis | DOM-GOV | Registro de comunicaciones |
| ACTIVO_INFORMACION | sgsi.asset | DOM-ACT | Activos en flujo |
| CARGO | sgsi.position | DOM-GOV | Cargos en flujo |
| INITIATIVE | sgsi.initiative | DOM-INIT | Iniciativas en flujo |
| SOA | sgsi.soa_analysis | DOM-SOA | SOA en flujo |
| ORGANIGRAMA | (calculated) | DOM-GOV | Organigrama en flujo |
| RISK_TREATMENT_PLAN | sgsi.asset_group | DOM-RSK | Plan de tratamiento en flujo |

**Nota:** Todos estos entity_types atraviesan el flujo documental. Inbox es un agregador de esos procesos, no un consumidor directo de esos dominios.

### Matriz de Riesgos Operacionales

- **Fuente:** `sgsi.asset_group` + `sgsi.probability_impact_level` (vía `sgsi.v2_asset_group_threat_risk_get_scenarios`)
- **Propietario:** DOM-RSK
- **Consumo en Inbox:** Lectura pura, visualización en componente `<OperativeRiskMatrix />`
- **Condición:** Solo si usuario es `asset_group owner`
- **Matrices:** 3x3 (buckets), 4x4 (levels), 5x5 (alias de 4x4 para retrocompatibilidad)

## Security / Access Control

**Niveles verificados:**

1. **Router:** Acceso base `admin-or-usuario` en `/inbox`
2. **Controller:** Extrae `customerId` y `userId` del JWT via `dataUser(req)`
3. **SQL:** Múltiples filtros por `customer_id` en WHERE clauses
4. **Ownership:** Asset group access validado por `asset_group.owner_person_id = person_id`
5. **Soft deletes:** Todos los queries verifican `deleted_at IS NULL`

**Tenant isolation:** CONFIRMED (comprobado en 3 capas: route/controller/SQL)

## Legacy / Technical Debt

**Registrado sin corrección:**

1. **Categorías UI vacías**
   - "Incidentes" y "Capacitaciones" visible en UI pero sin entity_types en SQL
   - Retornan 0 items (filtro rechaza esas categorías en el hook)
   - Status: DEAD UI CODE

2. **Labels de entity_type huérfanos**
   - "RISK_MATRIX" y "KPI_TRACKING" en ENTITY_TYPE_TITLE_FALLBACK pero nunca retornados por SQL
   - Status: ORPHAN LABELS

3. **Matrix5x5 alias retrocompatibilidad**
   - matrix5x5 es alias de matrix4x4 en `get_operative_risk_matrix()`
   - Status: INTENTIONAL (acceptable)

4. **Endpoint sin consumidor detectado**
   - `/inbox/enriched-activity` tiene consumidor en `/profile`, no era "huérfano"
   - Status: CONFIRMED LIVE (necesario para security profile)

## Estadísticas

- **Endpoints:** 2 (GET only)
- **Functions:** 4 (2 principales, 2 auxiliares)
- **Mutations:** 0 (read-only)
- **Entity types supported:** 15
- **Tables read:** ~25
- **Converges to:** DOM-DOCFLOW (primary), DOM-RSK (visualization)
- **Converges from:** 9+ dominios vía entity_type

## Archivos

```
docs/06-technical/inbox-sgsi/
├── README.md (este archivo)
├── endpoints/
│   ├── EP-INBOX-GET-ACTIVITY.yaml
│   └── EP-INBOX-GET-ENRICHED-ACTIVITY.yaml
└── functions/
    ├── FN-INBOX-GET-MAIN.yaml
    ├── FN-INBOX-GET-ENRICHED.yaml
    ├── FN-INBOX-ACTIVITY.yaml
    └── FN-INBOX-OPERATIVE-RISK-MATRIX.yaml
```

## Referencias Cruzadas

- **DOM-DOCFLOW Catalog:** [`docs/00-catalog/docflow.md`](../../00-catalog/docflow.md)
  - FLOW-DOCFLOW-003, FLOW-DOCFLOW-005, FLOW-DOCFLOW-006
  
- **DOM-RSK Functions:** [`docs/06-technical/risks/functions/`](../risks/functions/)
  - FN-V2-ASSET-GROUP-THREAT-RISK-GET-SCENARIOS (referenced)

- **Dashboard (equivalent aggregator):** [`docs/06-technical/dashboard/`](../dashboard/)

## Observaciones Arquitectónicas

**¿Por qué dos endpoints?**
1. `GET /inbox/activity` — Contexto de tareas pendientes (dashboard de usuario)
2. `GET /inbox/enriched-activity` — Contexto de auditoría/compliance (perfil de seguridad)

Aunque ambos usan `inbox_get_main_activity()`, sirven propósitos distintos y destinatarios diferentes (usuario vs. administrador/auditor).

**¿Por qué no es un dominio?**
- Sin operaciones propias (0 mutaciones)
- Sin estados internos
- No posee tablas
- Redirige todas las acciones

**¿Por qué es transversal?**
- Agrega datos de 9+ dominios
- Punto de entrada unificado
- Visualización de múltiples contextos

---

**Status:** TECHNICALLY DOCUMENTED (PHASE 3 complete)

**Next:** Await integration into parser/explorer regeneration.
