---
name: update-documentation
description: Analiza el impacto funcional y de trazabilidad de cambios de código reales (no solo "archivo modificado") y determina qué documentación en docs/00-catalog, docs/05-flows o docs/06-technical debe actualizarse, crearse, dejarse igual, marcarse como deuda, o requerir ADR/CHANGELOG/revisión de manual — nunca documenta 1:1 por archivo tocado. Usar al terminar una feature, antes de cerrar una sesión de desarrollo importante, o cuando el usuario pida "actualizar la documentación", "revisar trazabilidad" o "documentar este cambio".
---

# Skill: Actualizar Documentación de Trazabilidad

## Descripción

Mantiene actualizada la documentación de trazabilidad funcional del proyecto (`docs/00-catalog/`, `docs/05-flows/`, `docs/06-technical/`) cuando cambia el código. Analiza cambios **reales** (no solo "archivo modificado") para determinar su impacto en la cadena funcional: Operación de usuario → Endpoint → Función SQL → Tabla.

**Regla crítica**: La documentación representa **trazabilidad funcional**, no un inventario 1:1 del código. Nunca documenta solo porque un archivo cambió.

## Estándares Aplicables

Sigue **`docs/TRACEABILITY_STANDARD.md`** como única fuente de verdad:
- Relaciones técnicas se declaran una sola vez, se referencian por ID.
- `status: CONFIRMED` (verificado leyendo código completo) / `PARTIAL` / `AMBIGUOUS` / `NOT FOUND`.
- Tablas se derivan automáticamente del YAML de function, nunca tienen archivo propio.
- Convergencia (dos Operaciones → mismo endpoint/function) se detecta automáticamente por el Explorer.
- Dominios **FROZEN** (cerrados, requieren revisión formal) están listados en `docs/INDEX.md`.

## Cómo Funciona

### **Paso 1: Determinar Scope Real de Cambios**

Inspecciona y describe los cambios:
- `git status` (unstaged, staged)
- `git diff` (staged vs working)
- `git log` / `git diff main...HEAD` (commits en rama actual vs `main`)

**Nunca asumas** que una feature completa vive en `HEAD~1` o que puedes ignorar commits previos. Describe claramente qué archivos se modificaron y en qué capas viven (frontend/hook/router/controller/service-backend/query/función SQL/tabla/migración/test/config).

### **Paso 2: Reconstruir Cadena Funcional Real**

El objetivo no es clasificar por nombre de carpeta, sino **seguir el flujo real de datos y consumidores**:

1. **Función SQL modificada/nueva** (`api-sgsi/sql/sgsi/database/*/functions/*.sql`):
   - ¿Quién la llama? (búsqueda de `SELECT * FROM sgsi.<nombre>` o `SELECT sgsi.<nombre>` en queries/)
   - ¿Qué queries la usan? (búsqueda en `api-sgsi/src/queries/`)
   - ¿Qué modelos ejecutan esas queries? (búsqueda en `api-sgsi/src/models/`)
   - ¿Qué servicios llaman esos modelos? (búsqueda en `api-sgsi/src/services/`)
   - ¿Qué controladores llaman esos servicios? (búsqueda en `api-sgsi/src/controllers/`)
   - ¿Qué routers mapean esos controladores? (búsqueda en `api-sgsi/src/routers/`)
   - ¿Qué endpoint resulta? (match path+method)
   - ¿Qué Operación en `docs/05-flows/*/` usa ese endpoint? (búsqueda de `technical.endpoint: EP-*`)

2. **Endpoint nuevo/modificado** (`api-sgsi/src/routers/`, `controllers/`, `models/`, `queries/`):
   - Sigue hacia arriba (¿qué función SQL ejecuta?) y hacia abajo (¿qué Operación lo consume?).

3. **Frontend modificado** (`app-sgsi/src/`):
   - ¿Qué servicio/hook/store lo consume? (búsqueda de imports)
   - ¿Qué endpoint llama ese servicio? (búsqueda de Axios calls)
   - ¿Qué Operación describe ese endpoint? (búsqueda en `docs/05-flows/*/`)

### **Paso 3: Comparar Contra Documentación Existente**

Usa `docs/explorer/graph.json` (si está actualizado) o el conocimiento del estándar:

**Función SQL nueva/modificada:**
- ¿Es alcanzable desde una Operación ya documentada? (vía `technical.endpoint` → `EP-*.function` → `calls`)
- Sí + sin `FN-*.yaml` → Candidata a `CREATE_FUNCTION`
- Sí + con `FN-*.yaml` + cambió (tablas tocadas, calls) → `UPDATE_FUNCTION`
- No alcanzable + es utilitaria/interna → `NO_DOC_CHANGE` (respeta 281 vs ~686 funciones documentadas; no documentes 1:1)

**Endpoint nuevo/modificado:**
- ¿Se usa desde alguna Operación documentada?
- Sí + sin `EP-*.yaml` → Candidata a `CREATE_ENDPOINT`
- Sí + con `EP-*.yaml` + cambió → `UPDATE_ENDPOINT`
- No consumidor confirmado → Potencial `TRACEABILITY_DEBT` ("endpoint sin consumidor")

**Flujo de usuario nuevo:**
- **Antes de crear un FLOW**, busca convergencia con Operaciones ya existentes en **todos los dominios**:
  - ¿Usa el mismo endpoint que otra Operación? (convergencia directa)
  - ¿Mismo propósito funcional? (ej. Crear y Editar reutilizan `EP-ASSET-UPSERT`)
- Si converge → No dupliques FLOW; solo referencia el endpoint existente (ej. como nota en `## Consideraciones`)
- Si es genuinamente nueva → Candidata a `CREATE_FLOW`

**Cambio que afecta un dominio FROZEN:**
- Informa explícitamente en ANALYZE que el dominio está congelado y muestra qué se propone modificar.
- La aprobación del usuario para pasar de ANALYZE a APPLY cuenta como la revisión formal requerida; no pidas una segunda confirmación.

### **Paso 4: Modo ANALYZE vs APPLY**

**ANALYZE (primero, sin escribir nada):**
Presenta el análisis completo con:
- **Scope analyzed** — X archivos modificados, X dominios afectados
- **Updated** — qué `FLOW-*`, `EP-*`, `FN-*` se actualizarían
- **Created** — qué nuevos `FLOW-*`, `EP-*`, `FN-*` se crearían
- **No documentation required** — refactors internos, tests, cambios visuales, funciones no alcanzables
- **Traceability debt** — endpoints sin consumidor, funciones sin uso, divergencias
- **ADR** — ninguno / candidatos (se delega a `analyze-architectural-decisions`, no se redacta aquí)
- **CHANGELOG** — requiere código de ticket externo si no existe
- **Manual review** — si afecta operación visible para usuario final (nombre del manual + módulo + motivo)
- **Explorer** — se regenerará si hay cambios documentales

**APPLY (tras aprobación del usuario):**
Redacta/actualiza archivos justificados ejecutando en orden:
1. Guardar cambios en `docs/00-catalog/`, `docs/05-flows/`, `docs/06-technical/`
2. Si hubo cambios documentales, ejecutar: `npm run build` → `npm run validate` → `npm run smoke-test` (dentro de `docs/explorer/`)
3. Reportar PASS/FAIL de cada paso
4. Entregar checkpoint final

### **Paso 5: Reglas de Contenido**

**`definedIn:`** en cualquier `FN-*.yaml` nuevo/actualizado apunta a `funciones_sgsi.sql` o `funciones_corvus.sql` (raíz del repo), nunca a los archivos divididos de `api-sgsi/sql/sgsi/database/*/`. Rango de líneas verificado leyendo el **cuerpo completo** de la función.

**Deuda/legacy detectada:** Se registra en `## Hallazgos registrados (no corregidos, fuera de alcance de esta fase)` dentro del catálogo del módulo correspondiente. Nunca se corrige ni se refactoriza como efecto secundario.

**ADR_CANDIDATE:** Si el cambio implica una decisión arquitectónica, delégalo a `analyze-architectural-decisions`. Solo señala la necesidad; no redactes el ADR desde aquí.

**CHANGELOG_CANDIDATE:** Nunca inventes códigos de ticket (`ME-XXX`, `SGSI-XXX`, etc.). Si falta el código, señala "requiere código externo" en lugar de escribir la entrada.

**USER_MANUAL_REVIEW:** Si afecta una operación visible para el usuario final, señala:
- Manual afectado (ruta dentro de `docs/Documentacion_*/`)
- Módulo / Operación
- Motivo
- Sección probable para revisión

Nunca edites archivos `.docx` directamente; son binarios.

### **Paso 6: Regenerar Explorer y Validar**

Si en APPLY se modificó al menos un archivo en `docs/00-catalog/`, `docs/05-flows/` o `docs/06-technical/`:

Ejecuta **siempre** la cadena completa en orden (dentro de `docs/explorer/`):
```bash
npm run build       # parser.mjs: lee docs/ y escribe graph.json + data.js
npm run validate    # validate.mjs: corre 17 validaciones obligatorias
npm run smoke-test  # smoke-test.mjs: abre UI headless, valida interacciones principales
```

Reporta PASS/FAIL de cada paso.

Si **no hubo cambios documentales**, no ejecutes nada de esto.

### **Paso 7: Checkpoint Final**

Entrega un resumen estructurado (adaptado a nombres reales: `FN-*`, `EP-*`, `FLOW-*`, `DOM-*`):

```
UPDATE DOCUMENTATION — CHECKPOINT

Scope analyzed
- X cambios de código
- X dominios afectados
- Archivos modificados: [...list...]

Updated
- FLOW-ACT-003 — cambió entryPoint
- EP-ASSET-UPSERT — cambió modelo
- FN-V2-ASSET-UPSERT — cambió tablas

Created
- FN-NUEVA-FUNCION
- EP-NUEVA-ENDPOINT

No documentation required
- Cambios internos de refactoring
- Tests
- Cambios solo de logging
- Funciones no alcanzables desde Operaciones documentadas

Traceability debt
- EP-HUERFANO: sin consumidor confirmado en frontend
- FN-LEGACY: ya no se usa, pero existe en código

ADR
- Ninguno / Candidato: describe-la-decision-here

CHANGELOG
- Candidato — requiere código externo

Manual review
- Manual_Administrador: módulo Activos, Operación Crear, motivo: cambió nombre de campo en UI

Explorer
- Regenerado: graph.json + data.js
- Validaciones: PASS (17/17) / FAIL (describe-qué-falló)
- Smoke test: PASS / FAIL (describe-qué-falló)

Status: ✅ Listo para commit / ⚠️ Requiere revisión del cambio X
```

## Cuándo Usar

- Al terminar una feature importante (antes de PR)
- Antes de cerrar una sesión de desarrollo
- Cuando el usuario pida "actualizar la documentación", "revisar trazabilidad" o "documentar este cambio"
- Después de cambios en `api-sgsi/src/queries/`, `controllers/`, `services/`, `models/`, o funciones SQL

## Ejemplo Real

**Caso: Se modificó `sgsi.v2_asset_upsert`**

1. **Scope**: Cambio en `funciones_sgsi.sql` + ajuste en controlador de llamada
2. **Cadena**: `EP-ASSET-UPSERT` → `FN-V2-ASSET-UPSERT` → `sgsi.asset`, `sgsi.asset_history`
3. **Operaciones alcanzadas**: `FLOW-ACT-003` (Crear), `FLOW-ACT-004` (Editar), `FLOW-ACT-007` (Importar)
4. **Análisis**: `FN-V2-ASSET-UPSERT.yaml` existe → `UPDATE_FUNCTION` (si cambió tablas o calls)
5. **Documento**: Actualizar `docs/06-technical/assets/functions/FN-V2-ASSET-UPSERT.yaml` (rango de líneas + tablas + calls)
6. **Explorer**: Regenerar, validar, smoke-test

## Referencias

- **Estándar**: `docs/TRACEABILITY_STANDARD.md` (fuente de verdad)
- **Index**: `docs/INDEX.md` (dominios FROZEN)
- **Explorer**: `docs/explorer/` (parser, validate, smoke-test)
- **Ejemplos**: `docs/00-catalog/activos.md`, `docs/05-flows/assets/`, `docs/06-technical/assets/`
