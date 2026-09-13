---
name: AI Workflow
description: Guía operacional para documentar módulos SGSI con contexto bajo demanda
---

# AI Workflow — Documentación SGSI con Contexto Bajo Demanda

**Propósito:** Permitir a una IA documentar un nuevo módulo SGSI sin cargar preventivamente todo el contexto del proyecto.

**Principio fundamental:** `SEARCH FIRST → READ SECOND`

---

## 🎯 Flujo General

```
INDEX.md
  ↓
PHASE 1 — DISCOVER  (identifica frontera, anticipa duplicación)
  ↓
PHASE 2 — TRACE  (mapea trazabilidad real)
  ↓
PHASE 3 — DOCUMENT  (crea catálogo, FLOW, YAML)
  ↓
PHASE 4 — VALIDATE  (compila, verifica, declara ready)
```

**Duración esperada:**
- PHASE 1: 30–60 min (depende de complejidad)
- PHASE 2: 1–2 h (trazabilidad profunda)
- PHASE 3: 1–2 h (redacción)
- PHASE 4: 15 min (validación)

---

## 📖 PHASE 1 — DISCOVER

**Objetivo:** Identificar frontera del módulo, anticipar duplicación, mapear operaciones candidatas.

**Entrada:** Nombre del módulo (ej: "Wizard", "planning-resources/initiative")

### Paso 1: Localiza el código

Busca el módulo en:
```
app-sgsi/src/app/(menu)/[module]/     # Frontend
api-sgsi/src/routers/[module].*       # Backend (si existe)
```

Explora la estructura:
- ¿Cuáles son las rutas principales?
- ¿Qué componentes funcionales importa?
- ¿Hay store/services dedicadas?
- ¿Qué endpoints llama?

**NO leas todo el código.** Escanea structure + archivos principales.

### Paso 2: BUSCA PRIMERO en documentación

Antes de asumir nada, busca en `docs/`:

**Búsquedas por orden de prioridad:**

1. **Por nombre funcional:**
   ```bash
   grep -r "Wizard" docs/05-flows/
   grep -r "wizard" docs/00-catalog/
   grep -r "onboarding" docs/
   ```

2. **Por ruta o término técnico:**
   ```bash
   grep -r "/wizard" docs/05-flows/
   grep -r "planning-resources" docs/
   ```

3. **Por componentes o servicios:**
   ```bash
   grep -r "FormalizationDashboard" docs/
   grep -r "campaignStore" docs/
   ```

4. **Por endpoint:**
   ```bash
   grep -r "POST /wizard" docs/06-technical/
   grep -r "GET /campaign" docs/06-technical/
   ```

**Solo abre los documentos encontrados como relevantes.**

### Paso 3: Antiduplica

Si encontraste FLOW o endpoints candidatos:

- ¿Ya existe en algún dominio documentado?
- ¿Es un duplicado o una invocación de otro dominio?
- ¿El módulo es propietario o consumidor?

**Ejemplo:** Wizard llama `POST /asset/upsert` (FLOW-ACT-003). Wizard NO posee "Crear activo" — posee "Inicializar assets", que es orchestration.

### Paso 4: Mapea operaciones candidatas

NO todos los endpoints = FLOW.

Un FLOW debe satisfacer:
- ✅ **Operation:** Usuario hace algo con propósito claro
- ✅ **Multimodal:** Toca múltiples capas (UI → Service → DB)
- ✅ **Nombrativo:** Tiene nombre verbal + objeto ("Crear X", "Listar X", "Enviar X")
- ❌ **CRUD trivial:** GET /list es operación, no siempre FLOW
- ❌ **Computación pura:** POST /calculate sin UI es helper, no FLOW

**Listar candidatos:**
- Qué puede el usuario hacer aquí que no puede hacer en otro módulo?
- Cuáles son las mutaciones (escribir/cambiar estado)?
- Cuáles son las consultas significativas?

### Paso 5: Registra hallazgos de DISCOVER

Al terminar PHASE 1, debes tener:
- Frontera clara del módulo
- Lista de operaciones candidatas (5–20 típicamente)
- Dependencias detectadas (otros dominios)
- Señales de duplicación o ambigüedad
- Clasificación inicial: ¿Es un dominio nuevo? ¿Es parte de otro?

**Si no puedes resolver una ambigüedad:** Márcala `AMBIGUOUS` y continúa. No es bloqueante para PHASE 2.

---

## 🔍 PHASE 2 — TRACE

**Objetivo:** Para cada operación candidata, mapear trazabilidad completa: UI → Service → Endpoint → DB.

### Arquitectura esperada

```
UI (page / component)
  ↓
Hook (useModule → store/hooks/useModule.tsx)
  ↓
Service (module.Service.ts → axios call)
  ↓
Endpoint (POST /module/operation)
  ↓
Router (routers/module.ts)
  ↓
Controller (controllers/module.ts#operation)
  ↓
Model (models/module.ts#operation)
  ↓
Query (queries/module.ts#operation)
  ↓
DB Function (sgsi.v2_module_operation / corvus.function_name)
  ↓
Tables (sgsi.table, corvus.table, ...)
```

**NO asumas capas inexistentes.** Sigue la arquitectura real.

### Cómo trazar

Para cada operación candidata:

1. **Localiza el trigger UI:**
   - Qué botón / acción lo invoca?
   - Qué ruta o componente?

2. **Sigue hacia atrás:**
   - Hook llamado → `store/hooks/`
   - Service llamado → `store/services/`
   - Endpoint invocado → `docs/06-technical/[domain]/endpoints/`

3. **Si endpoint no existe en docs/:**
   - Búscalo en `api-sgsi/src/routers/`
   - ¿Es realmente un endpoint vivo o muerto?
   - ¿Está siendo usado en la UI actual?

4. **Sigue hacia adelante (backend):**
   - Controller → `api-sgsi/src/controllers/`
   - Model → `api-sgsi/src/models/`
   - Query → `api-sgsi/src/queries/`
   - DB Function → `funciones_sgsi.sql` o `funciones_corvus.sql`
   - Tables → Schema `sgsi.*` o `corvus.*`

5. **Registra convergencias:**
   - ¿Este endpoint sirve múltiples operaciones?
   - ¿Invoca functions de otros dominios?
   - ¿Tiene bloqueos/validaciones cruzadas?

### Reglas críticas de TRACE

- **`Operation != Endpoint`:** Una operación puede combinar múltiples endpoints. Un endpoint puede servir múltiples operaciones.
- **`Route != Domain`:** Una ruta puede reutilizar el endpoint de otro dominio.
- **`CRUD != FLOW`:** GET /list es operación, pero no siempre merece FLOW propio si es trivial.
- **`Endpoint LIVE != FLOW obligatorio`:** Un endpoint puede existir pero no tener consumidor en la UI actual.
- **`NOT FOUND != LEGACY`:** Si no encuentras un endpoint en docs/06-technical/, revisa código antes de asumir que está deprecated.
- **`No consumer != LEGACY automático`:** Un endpoint sin consumidor detectado podría ser para API pública o futura.

### Ambigüedades en TRACE

Si durante TRACE encuentras:
- Control de acceso unclear → registra como `AMBIGUOUS`
- Endpoint sin controller → registra como `AMBIGUOUS`
- Function que no está en docs/ → localiza + registra

**No crees automáticamente una fase adicional.** Si la ambigüedad impide continuar, pausá y solicita decisión. Típicamente no será necesario.

---

## 📝 PHASE 3 — DOCUMENT

**Objetivo:** Crear artefactos oficiales: catálogo, FLOW, endpoints YAML, functions YAML.

### 1. Crea el catálogo

Archivo: `docs/00-catalog/[module].md`

Usa esta estructura (ver `docs/00-catalog/activos.md` como referencia):

```markdown
---
id: DOM-[INITIALS]
type: catalog
name: [Nombre del dominio]
menuLabel: "[Etiqueta en menú]"
---

# [Nombre]

## Resumen
(200 palabras: qué es, alcance, entradas, salidas)

## Frontend Views
| Vista | Ruta | Componente principal |
|---|---|---|
| ... | ... | ... |

## Flows
| ID | Flow | Archivo |
|---|---|---|
| FLOW-[ID]-001 | ... | [...] |

## API
(Número de endpoints, ruta a docs/06-technical/)

## Database
(Schema, funciones, tabla principal, tablas de apoyo)

## Dependencias externas conocidas
| Dominio | Naturaleza | Dónde aparece |
|---|---|---|

## Hallazgos registrados (no corregidos, fuera de alcance)
- ...
- ...

## Diagrama de alto nivel
(Mermaid si aporta claridad)
```

**Importante:** Numeración de FLOW es secuencial dentro del dominio. Omite números cuando fusiones operaciones triviales. Decláralo explícitamente.

### 2. Crea FLOW

Archivo: `docs/05-flows/[domain]/[flow-name].md`

Usa esta estructura:

```markdown
---
id: FLOW-[DOM]-###
type: flow
domain: DOM-[ID]
name: [Nombre operación]
entryPoint: "[Cómo se invoca desde UI]"
frontend:
  route: [/ruta]
  pages:
    - [archivo de página Next.js]
  components:
    - [componentes funcionales]
  stores:
    - [zustand stores invocados]
  services:
    - [axios services invocadas]
technical:
  endpoint: [EP-ID]
  status: CONFIRMED
externalDependencies:
  - domain: [DOM-X]
    reason: "[Qué hace en ese dominio]"
---

# [Nombre]

## Propósito
(1–2 oraciones)

## Entrada desde UI
(Botón / trigger)

## Flujo funcional
1. (paso)
2. (paso)
...

## Frontend
(Componentes, hooks, stores)

## API
(Endpoint, método, acceso)

## Backend
(Router → Controller → Model → Query)

## Database
(Function, tablas tocadas, reglas)

## Consideraciones
(Ambigüedades, notas arquitectónicas)

## Trazabilidad
(Diagrama Mermaid: UI → API → DB)
```

### 3. Crea endpoints YAML

Archivo: `docs/06-technical/[domain]/endpoints/[EP-ID].yaml`

Estructura mínima:

```yaml
id: EP-[DOM]-[###]
type: endpoint
method: POST|GET|PUT|DELETE
path: /module/operation
access: admin-only | admin-or-usuario | public
router: api-sgsi/src/routers/[module].ts:LINE
controller: api-sgsi/src/controllers/[module].ts#operation
model: api-sgsi/src/models/[module].ts#operation
function: FN-[ID]
status: CONFIRMED
```

### 4. Crea functions YAML

Archivo: `docs/06-technical/[domain]/functions/[FN-ID].yaml`

Estructura mínima:

```yaml
id: FN-[DOM]-[###]
type: db-function
name: [schema].[function_name]
definedIn: [archivo].sql:[líneas]
status: CONFIRMED
calls:
  - FN-[REF]
  - FN-[REF]
tables:
  - { table: [schema].[table], access: READ|WRITE }
notes: >
  (si hay convergencia técnica, invocaciones inesperadas, etc.)
```

### 5. Integra con Explorer

Los archivos YAML son **fuente de verdad** para `docs/explorer/parser.mjs`.

No edites `graph.json` manualmente. El parser lo regenera.

Para validar:
```bash
cd docs/explorer
npm run validate
npm run smoke-test
```

Si hay errores, revisa la estructura YAML.

---

## ✅ PHASE 4 — VALIDATE

**Objetivo:** Asegurar que la documentación sea válida y completa.

### Comandos obligatorios

```bash
cd docs/explorer
npm run validate      # Chequea integridad YAML
npm run smoke-test    # Verifica referencias cruzadas
```

**Debe resultar:**
- ✅ YAML válido
- ✅ Todas las referencias resueltas
- ✅ Sin broken links

### Criterio de DONE

Un módulo está `TRACEABILITY COMPLETE` si:

- ✅ `docs/00-catalog/[module].md` existe y es válido
- ✅ Todos los FLOW tienen archivo en `docs/05-flows/[domain]/`
- ✅ Todos los endpoints tienen `.yaml` en `docs/06-technical/[domain]/endpoints/`
- ✅ Todas las DB functions tienen `.yaml` en `docs/06-technical/[domain]/functions/`
- ✅ Validaciones pasan
- ✅ No hay `TODO`, `FIXME`, o marcas de trabajo incompleto

---

## ⚠️ Reglas Obligatorias

**Durante documentación, recuerda SIEMPRE:**

- ✅ `Operation != Endpoint` — Mapea cuidadosamente, no asumas 1:1
- ✅ `Route != Domain` — Una ruta puede reutilizar endpoint de otro dominio
- ✅ `Screen != FLOW` — Una pantalla puede tener múltiples FLOW o ninguno
- ✅ `CRUD != FLOW` — CRUD simple no siempre merece FLOW documentado
- ✅ `Endpoint LIVE != FLOW obligatorio` — Endpoint puede existir sin consumidor UI
- ✅ `NOT FOUND != LEGACY` — Verifica código antes de asumir
- ✅ `No consumer != LEGACY automático` — Podría ser para API pública
- ✅ `Generated Explorer files != source of truth` — graph.json es output, no input

**Prohibiciones durante documentación:**

- ❌ **No modificar código funcional** — Solo documentas, no refactorizas
- ❌ **No corregir deuda** — La documentación no es oportunidad de cleanup
- ❌ **No crear tests** — Si descubres un bug, registra pero no lo corrijas aquí
- ❌ **No agregar automatización** — Sin IR loops, agentes o nuevos builds

**Si encuentras problemas:**

- 🔴 **Security issue:** Registra en catálogo con `AMBIGUOUS` o `REVIEW REQUIRED`
- 🟡 **Deuda técnica:** Anota en catálogo bajo "Hallazgos", NO corrijas
- 🔵 **Ambigüedad funcional:** Marca y documenta, pausá si es bloqueante

---

## 🔄 Contexto Bajo Demanda

**NO hagas esto:**

```
1. Leer contexto.md completo ❌
2. Abrir todos los dominios FROZEN ❌
3. Estudiar todas las tablas ❌
4. Redescubrir el SGSI ❌
```

**Haz esto:**

```
1. INDEX.md → ubícate
2. Grep específico por nombre/ruta → busca referencias
3. Abre solo documentos encontrados como relevantes
4. PHASE 1 DISCOVER completa → si hay ambigüedad, expandir búsqueda
5. PHASE 2 TRACE → sigue trazabilidad real
6. TRACEABILITY_STANDARD.md → solo si necesitas confirmar normativa
```

**Caso de excepción:**

Si después de PHASE 1 DISCOVER:
- No encuentras referencias a ningún otro dominio
- La frontera es unclear
- Hay múltiples interpretaciones posibles

Entonces y SOLO entonces: lee `contexto.md` (sección relevante).

---

## 📋 Ejemplo: Documentar Wizard (PENDING / HIGH PRIORITY)

### PHASE 1 — DISCOVER (tu entrada)

```
Módulo: Wizard
Ruta: app/(menu)/wizard/

Búsquedas:
1. grep -r "wizard\|Wizard" docs/05-flows/ 
   → Hallazgo: Wizard reutiliza EP-ASSET-UPSERT (DOM-ACT)
   
2. grep -r "FormalizationDashboard" docs/
   → Hallazgo: Componente que invoca /asset endpoint
   
3. grep -r "/wizard" docs/06-technical/
   → Resultado: Ningún endpoint documentado bajo /wizard aún
   
Operaciones candidatas:
- Initiate SGSI (root entry)
- Initialize context (wizard/context)
- Initialize governance (wizard/context/government)
- Initialize assets (reutiliza FLOW-ACT-003)
- Review assets before finalization

Dependencias detectadas:
- DOM-ACT (reutiliza asset creation)
- DOM-CTX (reutiliza context setup)
- DOM-GOV (reutiliza governance config)
- DOM-SOA (posible inicialización)

Duplicación:
- NO crear FLOW-WIZ-001 "Crear activo"
- SÍ crear FLOW-WIZ-003 "Inicializar activos desde wizard"
  (que invoca FLOW-ACT-003 orquestadamente)
```

→ **Continúa a PHASE 2** con esta información.

---

## 🔗 Referencia de Archivos

| Archivo | Propósito | No toques |
|---|---|---|
| `docs/INDEX.md` | Mapa de navegación | — |
| `docs/AI_WORKFLOW.md` | Esta guía | — |
| `docs/TRACEABILITY_STANDARD.md` | Autoridad normativa | ✅ FROZEN |
| `docs/00-catalog/*.md` | Dominios documentados | Respetar status FROZEN |
| `docs/05-flows/**/*.md` | FLOW detalles | Respetar status FROZEN |
| `docs/06-technical/**/*.yaml` | Endpoints/functions (generado) | Validar, no editar .json |
| `contexto.md` | Contexto general (raíz) | Uso opcional, bajo demanda |

---

## 📞 Soporte

Si durante documentación necesitas:

- **Clarificación de arquitectura:** Revisa `api-sgsi/src/app.ts`, `app-sgsi/src/store/`
- **Estructura de una operación:** Abre un catálogo FROZEN, estudia 1 FLOW completo
- **Reglas de SQL/validación:** `TRACEABILITY_STANDARD.md` sección "Critical Constraints"
- **Ayuda trazando:** Busca un ejemplo en `docs/05-flows/assets/create-asset.md`

---

## ✨ Resumen

1. **DISCOVER:** Busca primero, lee después. Anticipa duplicación.
2. **TRACE:** Sigue arquitectura real, no asumas capas.
3. **DOCUMENT:** Crea catálogo + FLOW + YAML siguiendo formato.
4. **VALIDATE:** Compila y verifica, declara TRACEABILITY COMPLETE.

**Contexto bajo demanda:** No cargues preventivamente todos los dominios. Busca → Lee → Expande si necesario.

**Duración:** 2–5 h típicamente (varía por complejidad del módulo).
