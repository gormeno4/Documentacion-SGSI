---
id: FLOW-STK-004
type: flow
name: Consultar Historial y Versiones
domain: DOM-STK
---

# Consultar Historial y Versiones de Análisis

**ID:** `FLOW-STK-004`

## Intención

Usuario consulta el historial completo de versiones de análisis de partes interesadas: visualiza lista de todas las versiones pasadas, selecciona una y ve sus datos completos en modo solo-lectura, incluyendo estado de publicación (vigente, no vigente, borrador) e información de flujo documental si aplica.

## Flujo de Usuario

1. Usuario en `/stake-holder` visualiza análisis actual
2. Clickea botón "Ver Historial de Versiones" o sección de historia
3. Abre modal/panel con tabla de versiones:
   - Número de versión
   - Estado (Vigente / No Vigente / Borrador)
   - Fecha creación / Fecha completado
   - Creator / Completer
   - Información de proceso DocFlow (si existe)
4. Usuario selecciona una versión histórica
5. Sistema GET `/stakeholder/analysis/versions` (listar) → GET `/stakeholder/analysis/version/:id` (cargar detalles)
6. UI renderiza versión seleccionada:
   - Tabla de partes interesadas de esa versión
   - Todos los atributos en modo read-only
   - Label de estado prominente
7. Usuario puede:
   - Ver otra versión (seleccionar de tabla)
   - Exportar a PDF (si disponible)
   - Cerrar modal

## API

### Entry Points

- **GET** `/stakeholder/analysis/versions` — listar versiones
- **GET** `/stakeholder/analysis/version/:id` — cargar versión específica

### Cadena Técnica

**GET Versions:**
`/stakeholder/analysis/versions` → `StakeholderModel.getVersions(customerId)` → `sgsi.v2_stakeholder_analysis_get_versions(customerId)` → retorna JSON [] de {id, version, is_complete, is_active, created_at, completed_at, ...}

**GET Version Detail:**
`/stakeholder/analysis/version/:id` → `StakeholderModel.getVersionById(id)` → `sgsi.v2_stakeholder_analysis_get_version_by_id(id)` → retorna JSON {analysis, stakeholderList}

## Database

### Tables Read

- `sgsi.stake_holder_analysis` — lectura de versiones e historial
- `sgsi.stake_holder` — lectura de partes de versión específica
- `sgsi.stake_holder_needs`, `expectations`, `information_security`, `legal_regulatory` — lectura de atributos
- `sgsi.suggested_profile_stake_holder` — LEFT JOIN para nombre de perfil

## Security Finding

⚠️ **Cross-Tenant Read — CONFIRMED:**

Endpoint `GET /stakeholder/analysis/version/:id` NO valida que `analysis_id` pertenezca al `customerId` de la sesión.

**Cadena verificada:**
- Router: `verifyToken`, `verifyAdminOrUsuario` (validan auth/rol, NO customerId para param)
- Controller: solo valida formato de `id`
- Model: pasa solo `id` a SQL
- SQL: `WHERE id = p_analysis_id` (sin validación customer_id)

**Riesgo:** Usuario autenticado de Tenant-1 podría consultar `analysis_id` de Tenant-2 si conoce UUID.

**Clasificación:** CONFIRMED CROSS-TENANT READ — Documentado, NO corregido (patrón del proyecto).

## Consideraciones

- **Modo Read-Only:** Toda versión histórica se renderiza como read-only en UI. No hay endpoints de edición para versiones pasadas.
- **Estado de Versión:**
  - Vigente: `is_complete=true, is_active=true`
  - No Vigente: `is_complete=true, is_active=false`
  - Borrador: `is_complete=false, is_active=true` (solo versión actual editable)
- **Tenant Isolation (Parcial):** EP-STK-VERSIONS-LIST valida customerId; EP-STK-VERSION-GET NO (hallazgo).
- **Integración DocFlow:** Si versión fue publicada vía DocFlow, UI puede mostrar historial de proceso (steps, aprobadores, etc.) via `loadWorkflowState()`.

## Dependencias Externas

- **DocFlow (entrada):** Información de proceso/aprobación disponible si versión fue publicada. Lectura desde FLOW-DOCFLOW-004/010.

## Estado

✓ CONFIRMED — 2 endpoints live (1 con validación, 1 con hallazgo de seguridad).

