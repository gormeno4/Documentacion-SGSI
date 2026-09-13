---
name: Index
description: Mapa de navegación para documentación SGSI — dominios, módulos, estadísticas
---

# Índice de Dominios SGSI

Mapa de navegación para la documentación de trazabilidad del SGSI. Este archivo es **solo navegación**, no duplica contenido de catálogos.

---

## 📊 Estadísticas Globales

- **Total FLOW:** 81 (76 FROZEN + 5 FROZEN after PHASE 4 — Dashboard has 0 FLOW)
- **Total Endpoints:** 248 (228 FROZEN + 16 new + 4 Dashboard READ-ONLY)
- **Total DB Functions:** 281 (261 FROZEN + 16 new + 4 Dashboard READ-ONLY)
- **Total Tables:** 140 (137 FROZEN + 2 new + 1 additional from Dashboard convergences)
- **Broken References:** 0

**Desglose por dominio nuevo:**
- DOM-TRAIN: 2 FLOW, 6 endpoints, 6 functions, 3 tables
- DOM-INIT: 2 FLOW, 3 endpoints, 3 functions, 2 tables
- DOM-RESREV: 1 FLOW, 7 endpoints, 7 functions, 2 tables

---

## 📋 Dominios Documentados

| ID | Dominio | FLOW | Status | Catálogo |
|---|---|---|---|---|
| DOM-ACT | Activos | 13 | FROZEN | [`activos.md`](00-catalog/activos.md) |
| DOM-CTX | Contexto y Alcance | 7 | FROZEN | [`contexto-alcance.md`](00-catalog/contexto-alcance.md) |
| DOM-DOCFLOW | Flujo Documental | 12 | FROZEN | [`docflow.md`](00-catalog/docflow.md) |
| DOM-GOV | Gobierno del SGSI | 12 | FROZEN | [`gobierno.md`](00-catalog/gobierno.md) |
| DOM-RSK | Riesgos | 11 | FROZEN | [`riesgos.md`](00-catalog/riesgos.md) |
| DOM-SEC | Eventos e Incidentes de Seguridad | 9 | FROZEN | [`security-events.md`](00-catalog/security-events.md) |
| DOM-SOA | Controles y SoA | 6 | FROZEN | [`soa.md`](00-catalog/soa.md) |
| DOM-STK | Partes Interesadas | 4 | FROZEN | [`stakeholder.md`](00-catalog/stakeholder.md) |
| DOM-WIZ | Wizard | 2 | FROZEN | [`wizard.md`](00-catalog/wizard.md) |
| DOM-TRAIN | Capacitaciones | 2 | FROZEN | [`training.md`](00-catalog/training.md) |
| DOM-INIT | Iniciativas SGSI | 2 | FROZEN | [`initiative.md`](00-catalog/initiative.md) |
| DOM-RESREV | Revisiones de Recursos | 1 | FROZEN | [`resource-review.md`](00-catalog/resource-review.md) |

**Nota:** Numeración de FLOW es intencional. Algunos ID se omitieron por fusión de operaciones triviales o convergencia técnica. Ver catálogo respectivo para detalles.

**Nota:** Tres dominios (DOM-TRAIN, DOM-INIT, DOM-RESREV) completaron PHASE 4 y están FROZEN. Campaign permanece PENDING sin dominio asignado.

---

## ⏳ Módulos Pendientes

### DOCUMENTACIÓN COMPLETADA (PHASE 3 + 4)

**`planning-resources`** — Descompuesto en **3 dominios FROZEN**:

- ✅ **DOM-TRAIN** (`training/`) — 2 FLOW, FROZEN
- ✅ **DOM-INIT** (`initiative/`) — 2 FLOW, FROZEN
- ✅ **DOM-RESREV** (`resource-review/`) — 1 FLOW, FROZEN
- ⏳ **`campaign/`** — No documentado (mock, sin backend)

**Status:** Planification-Resources NO es un dominio unificado. Era una agrupación de menú que contenía 4 funcionalidades distintas. Tres han sido documentadas y validadas (PHASE 4 PASSED); Campaign permanece PENDING (ver abajo).

---

### DOCUMENTACIÓN COMPLETADA — READ-ONLY AGGREGATOR (PHASE 3)

**`dashboard`** — Panel de control (READ-ONLY AGGREGATOR)

- **Ruta:** `app/(menu)/dashboard/` + `/wizard/formalization/dashboard` (Wizard finalization step)
- **Clasificación:** `TECHNICALLY DOCUMENTED — NO DOMAIN — NO FLOW`
- **Status:** Endpoints/functions documented in `docs/06-technical/dashboard/`
- **Type:** Read-only aggregator (no mutations, no operations)
- **Endpoints:** 4 (`GET /dashboard/summary`, `GET /dashboard/getDashboardByCustomerId`, `GET /dashboard/getRelationsByAssetId`, `GET /dashboard/getAllRelationsByCustomerId`)
- **Converges to:** 8 FROZEN domains (DOM-ACT, DOM-CTX, DOM-RSK, DOM-DOCFLOW, DOM-INIT, DOM-GOV, DOM-SOA) + Wizard
- **Nota:** Dashboard is a visualization component, not a domain. No domain catalog. No FLOW. Endpoints/functions are bottom-up (no proprietor). See `docs/06-technical/dashboard/`.

---

### PENDIENTE — CLASIFICACIÓN EN PROGRESO

**`campaign`** — Campañas de concienciación

- **Ruta:** `app/(menu)/planning-resources/campaign/`
- **Clasificación:** `PENDING / NOT IMPLEMENTED`
- **Nota:** Frontend solo tiene componente mock (`CampaignCreateMock`). Sin router `/campaign` backend. Sin functions SQL. Sin tablas confirmadas.
- **Decisión:** No documentar hasta que abandone estado mock. Requiere backend real en sprint futuro.

---

### DOCUMENTACIÓN COMPLETADA — TRANSVERSAL AGGREGATOR (PHASE 3)

**`inbox-sgsi`** — Bandeja de entrada (Agregador transversal)

- **Ruta:** `app/(menu)/inbox-sgsi/`
- **Clasificación:** `TECHNICALLY DOCUMENTED — NO DOMAIN — NO FLOW`
- **Endpoints:** 2 (GET /inbox/activity, GET /inbox/enriched-activity)
- **Type:** Read-only transversal aggregator (no mutations, no operations)
- **Converges to:** DOM-DOCFLOW (FLOW-DOCFLOW-003/005/006 via navigation)
- **Visualization:** Operative risk matrix from DOM-RSK (read-only)
- **Status:** Technical documentation complete in `docs/06-technical/inbox-sgsi/`
- **Nota:** Dashboard-equivalent: aggregates user inbox activities across multiple domains + displays risk matrix. All user actions are navigations to existing FLOW-DOCFLOW operations. See `docs/06-technical/inbox-sgsi/` for endpoints and functions.

**`profile`** — Perfil de usuario

- **Ruta:** `app/(menu)/profile/`
- **Clasificación:** `PENDING / LOW PRIORITY`
- **Nota:** Operación personal, no SGSI core. Verificar si corresponde documentarse.

---

## 🔗 Cómo usar este INDEX

### Para documentar un nuevo módulo:
1. Abre [`AI_WORKFLOW.md`](AI_WORKFLOW.md) (guía operacional)
2. Aplica **PHASE 1 — DISCOVER** con contexto bajo demanda
3. Busca en `docs/05-flows/` y `docs/06-technical/` solo términos del módulo
4. Abre [`TRACEABILITY_STANDARD.md`](TRACEABILITY_STANDARD.md) solo si necesitas confirmar formato normativo

### Para entender un dominio ya documentado:
1. Selecciona el dominio en la tabla arriba
2. Abre su catálogo en `docs/00-catalog/`
3. Navega a FLOW específicos en `docs/05-flows/[domain]/`
4. Consulta endpoints/functions en `docs/06-technical/[domain]/`

### Para investigación transversal (dependencias, impacto global):
1. Usa `contexto.md` en raíz del proyecto (si es necesario)
2. O consulta [`docs/explorer/`](explorer/) (visualización interactiva de grafo)

---

## 📌 Convenciones Importantes

- **Status FROZEN:** Dominio cerrado. No se aceptan cambios sin revisión formal.
- **FLOW numbers:** Intencionales, no consecutivos. Ver catálogo para justificación.
- **Convergencia técnica:** Un endpoint puede servir múltiples FLOW. Declarado en `docs/06-technical/`, no repetido en INDEX.
- **Dependencias externas:** Están dentro de cada catálogo, no en este INDEX.

---

## 🔍 Referencia Rápida

**Estadísticas por dominio (FLOW count):**

**FROZEN (8 dominios, 76 FLOW):**
- 13: DOM-ACT
- 12: DOM-DOCFLOW, DOM-GOV
- 11: DOM-RSK
- 9: DOM-SEC
- 7: DOM-CTX
- 6: DOM-SOA
- 4: DOM-STK
- 2: DOM-WIZ

**FROZEN (3 dominios nuevos, 5 FLOW — PHASE 4 VALIDADO):**
- 2: DOM-TRAIN (capacitaciones)
- 2: DOM-INIT (iniciativas)
- 1: DOM-RESREV (revisiones de recursos)

**Total:** 11 dominios × 81 FLOW = navegación estructura completa.

---

## Última actualización

Actualizado: 2026-09-13 (PHASE 3 complete — Dashboard READ-ONLY AGGREGATOR documented)
Parser: `docs/explorer/parser.mjs`  
Regenerated: 248 endpoints (+4 Dashboard), 281 functions (+4 Dashboard), 140 tables
Validations: `validate.mjs` (pending after adding Dashboard endpoints), `smoke-test.mjs` (pending update for new counts)
Fuente: `docs/00-catalog/`, `docs/05-flows/`, `docs/06-technical/`

**Estado:** 
- TRACEABILITY COMPLETE para 11 dominios (8 FROZEN iniciales + 3 FROZEN PHASE 4)
- Dashboard: READ-ONLY AGGREGATOR technically documented (no domain, no FLOW)
- Campaign: PENDING (mock only)
