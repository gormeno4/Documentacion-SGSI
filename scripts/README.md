# Scripts de Validación de Arquitectura y Seguridad

Esta carpeta contiene **11 scripts Node.js standalone** que validan el cumplimiento de reglas definidas en `.rulesproyect` (estándares de arquitectura, seguridad, base de datos y convenciones de código).

## Uso General

Cada script es **ejecutable de forma independiente** sin dependencias externas (solo `fs` y `path`):

```bash
node scripts/<nombre-del-script>.js
```

**Exit codes:**
- `0` — Validación pasada (sin violaciones)
- `1` — Se encontraron violaciones o problemas

Cada script también tiene una **skill Claude asociada** en `.claude/skills/<nombre>/SKILL.md` que proporciona contexto detallado, ejemplos ✅/❌, y referencias a `.rulesproyect`.

---

## Índice Rápido

| Script | Qué valida | Dónde escanea |
|--------|-----------|---------------|
| `analyze-architectural-decisions.js` | Listado de ADRs existentes | `docs/adrs/` (todas las secciones) |
| `detect-pl-pgsql-business-logic.js` | Lógica de negocio en PL/pgSQL | `_database/` (funciones/triggers) |
| `validate-component-size.js` | Tamaño de componentes funcionales | `app-sgsi/src/components/functional/` |
| `validate-jwt-config.js` | Configuración de JWT y bcryptjs | `api-sgsi/src/config/jwt.ts`, `auth.service.ts` |
| `validate-middleware-order.js` | Orden y seguridad de middlewares | `api-sgsi/src/app.ts` |
| `validate-mutation-lockdown.js` | Bloqueo de inputs durante mutaciones | `app-sgsi/src/components/functional/` |
| `validate-naming-conventions.js` | Convenciones de nombres | `app-sgsi/src/`, `api-sgsi/src/`, `.env` |
| `validate-soft-deletes.js` | Uso de soft deletes en operaciones delete | `api-sgsi/src/queries/`, `api-sgsi/sql/sgsi/database/` |
| `validate-sql-params.js` | Parámetros SQL seguros (sin inyección) | `api-sgsi/src/queries/` |
| `validate-state-transitions.js` | Validación de máquinas de estado | `api-sgsi/src/services/` |
| `validate-validation-engines.js` | Engines de validación correctos (Zod/Joi) | `app-sgsi/src/`, `api-sgsi/src/` |

---

## Scripts Detallados

### 1. `analyze-architectural-decisions.js`

**Propósito:**  
Helper de listado (no es un validador). Indexa los ADRs (Architecture Decision Records) existentes en `docs/adrs/` organizados por sección de menú.

**Qué revisa:**
- Recorre los 10 directorios de sección (`00-transversal`, `01-contexto-alcance`, ..., `09-catalogos`)
- Extrae del frontmatter markdown: `Estado:` y `# ADR-N — <título>`
- Agrupa por sección y lista alfabéticamente

**Dónde escanea:**
- `docs/adrs/<00..09-sección>/ADR-*.md`

**Cómo ejecutar:**
```bash
node scripts/analyze-architectural-decisions.js
```

**Salida:**
- **Éxito (exit 0):** Tabla de ADRs con estado, agrupados por sección
- **Sin ADRs (exit 0):** Mensaje informativo "No ADRs found yet"

**Nota:**  
Este script se invoca automáticamente por la skill `analyze-architectural-decisions` para ayudar a Claude a decidir si es necesario crear un nuevo ADR tras cambios arquitectónicos.

---

### 2. `detect-pl-pgsql-business-logic.js`

**Propósito:**  
Asegurar que **PL/pgSQL solo contiene lógica de integridad y auditoría**, no lógica de negocio (que debe estar en Node.js).

**Qué revisa:**
- Busca `CREATE FUNCTION`, `CREATE TRIGGER`, `CREATE PROCEDURE` en archivos SQL
- Detecta patrones sospechosos de lógica de negocio:
  - `IF ... THEN` (condicionales complejos)
  - `CASE WHEN` (switching de lógica)
  - `INSERT INTO ... SELECT` (transformaciones de datos)
  - `UPDATE ... WHERE (SELECT ...)` (updates complejos)
  - `FOR ... IN SELECT` (loops)
  - `RAISE EXCEPTION` (validaciones de negocio)
- Ignora líneas que solo referencian `NEW.`/`OLD.`, auditoría o constraints

**Dónde escanea:**
- `_database/` (recursivamente, todos los `.sql` y `.plpgsql`)

**Cómo ejecutar:**
```bash
node scripts/detect-pl-pgsql-business-logic.js
```

**Salida:**
- **Éxito (exit 0):** "✅ PL/pgSQL contains only integrity/audit logic"
- **Violación (exit 1):** Lista de archivos con líneas sospechosas, patrón detectado y número de línea

---

### 3. `validate-component-size.js`

**Propósito:**  
Cumplir el límite de **800 líneas máximo** en componentes funcionales (`.rulesproyect`).

**Qué revisa:**
- Cuenta las líneas de cada `.tsx` y `.ts` en `app-sgsi/src/components/functional/`
- Falla si alguno supera 800 líneas (incluyendo comentarios y espacios en blanco)

**Dónde escanea:**
- `app-sgsi/src/components/functional/*.tsx`
- `app-sgsi/src/components/functional/*.ts`

**Cómo ejecutar:**
```bash
node scripts/validate-component-size.js
```

**Salida:**
- **Éxito (exit 0):** "✅ All functional components are within 800-line limit"
- **Violación (exit 1):** Lista de archivos que superan el límite con el contador de líneas y exceso

---

### 4. `validate-jwt-config.js`

**Propósito:**  
Validar la configuración de **JWT dual-token** y **bcryptjs** según `.rulesproyect`:
- Access token: 15 minutos (900 segundos)
- Refresh token: 7 días (604800 segundos)
- Refresh token cookie: `httpOnly`, `Secure`, `SameSite=Strict`
- bcryptjs cost factor ≥ 12

**Qué revisa:**
- Busca líneas con `access` + `expir` → debe ser 900 o `15m`
- Busca líneas con `refresh` + `expir` → debe ser 604800 o `7d`
- Valida presencia de flags de cookie: `httpOnly`, `secure`, `samesite` (strict)
- Verifica bcryptjs cost ≥ 12

**Dónde escanea:**
- `api-sgsi/src/config/jwt.ts`
- `api-sgsi/src/services/auth.service.ts`

**Cómo ejecutar:**
```bash
node scripts/validate-jwt-config.js
```

**Salida:**
- **Éxito (exit 0):** "✅ JWT configuration is correct"
- **Violación (exit 1):** Lista de problemas por archivo y línea (acceso/refresh times, cookie flags, bcrypt cost)

---

### 5. `validate-middleware-order.js`

**Propósito:**  
Validar el **orden correcto de middlewares** en Express según `.rulesproyect` y detectar configuraciones inseguras.

**Qué revisa:**
- Orden exacto de middlewares: `trust proxy` → `helmet` → `cors` → `rate limit` → `hpp` → `body parser`
- Detecta `unsafe-inline` en configuración de Helmet (violación de CSP)
- Valida que body parser limite sea 10kb (o 50mb solo para uploads)

**Dónde escanea:**
- `api-sgsi/src/app.ts`

**Cómo ejecutar:**
```bash
node scripts/validate-middleware-order.js
```

**Salida:**
- **Éxito (exit 0):** "✅ Middleware order is correct and secure"
- **Violación (exit 1):** Lista de problemas: middleware fuera de orden, `unsafe-inline` detectado, o límite de body incorrecto

---

### 6. `validate-mutation-lockdown.js`

**Propósito:**  
Garantizar que durante operaciones asincrónicas (`isLoading`, `isSubmitting`), **TODOS los inputs están deshabilitados**, no solo el botón submit.

**Qué revisa:**
- En componentes `.tsx` de `app-sgsi/src/components/functional/`:
  - Si usa `isLoading` o `isSubmitting`
  - Cuenta cuántos `<input>`, `<select>`, `<textarea>` existen
  - Cuenta cuántos tienen `disabled={isLoading}`, `disabled={isSubmitting}` o `readOnly={isLoading}`
  - Falla si no todos están bloqueados

**Dónde escanea:**
- `app-sgsi/src/components/functional/*.tsx`

**Cómo ejecutar:**
```bash
node scripts/validate-mutation-lockdown.js
```

**Salida:**
- **Éxito (exit 0):** "✅ All forms have proper mutation lockdown"
- **Violación (exit 1):** Lista de componentes con inputs parcialmente desbloqueados durante mutación (ej: "2/5 inputs locked")

---

### 7. `validate-naming-conventions.js`

**Propósito:**  
Cumplir las **convenciones de nombres** en el proyecto:
- Componentes: **PascalCase** (ej: `RiskMatrix.tsx`)
- Hooks: **camelCase** + prefijo `use` (ej: `useFetchUser.ts`)
- Carpetas: **kebab-case** (ej: `api-service-v1/`)
- Columnas DB: **snake_case** (ej: `user_id`)
- Variables env: **SCREAMING_SNAKE_CASE** (ej: `JWT_SECRET`)

**Qué revisa:**
- Archivos en `components/ui/` y `components/functional/` → PascalCase
- Archivos en `customHooks/` → camelCase + `use` prefix
- Nombres de columnas en `api-sgsi/src/queries/` → snake_case
- Variables en `.env` y `.env.local` → SCREAMING_SNAKE_CASE

**Dónde escanea:**
- `app-sgsi/src/components/`
- `app-sgsi/src/customHooks/`
- `api-sgsi/src/queries/`
- `.env`, `.env.local`

**Cómo ejecutar:**
```bash
node scripts/validate-naming-conventions.js
```

**Salida:**
- **Éxito (exit 0):** "✅ All naming conventions are correct"
- **Violación (exit 1):** Lista de archivos/variables con convenciones incorrectas (tipo, archivo, esperado vs. encontrado)

---

### 8. `validate-soft-deletes.js`

**Propósito:**  
Asegurar que **todas las operaciones delete sean soft deletes** (`deleted_at = now()` o `is_active = false`), no hard deletes (`DELETE FROM`). Es el script más elaborado.

**Qué revisa:**
1. **Extrae** llamadas a funciones SQL (`sgsi.*`, `corvus.*`) desde `api-sgsi/src/queries/*.ts`
2. **Resuelve** el archivo real en `api-sgsi/sql/sgsi/database/<schema>/functions/<nombre>.sql`
3. **Analiza** el cuerpo SQL:
   - Si contiene `DELETE FROM` sin patrón soft-delete → busca si la tabla tiene columnas soft-delete (`deleted_at`, `is_active`)
     - ✅ Si **NO tiene** soft-delete columns (tabla de unión/link) → aceptable (warning)
     - ❌ Si **SÍ tiene** soft-delete columns → **VIOLACIÓN CRÍTICA**
   - Si mezcla hard delete + soft delete → **VIOLACIÓN MEDIA**
4. **Reporta** funciones no encontradas como SKIPPED (legacy, etc.)

**Dónde escanea:**
- `api-sgsi/src/queries/*.ts` (extrae llamadas)
- `api-sgsi/sql/sgsi/database/<schema>/functions/` (resuelve definiciones)
- `api-sgsi/sql/sgsi/database/<schema>/tables/` (verifica columnas)

**Cómo ejecutar:**
```bash
node scripts/validate-soft-deletes.js
```

**Salida:**
- **Éxito (exit 0):** "✅ All delete functions use soft-delete patterns"
  - Opcionalmente lista warnings de hard deletes en link tables
  - Opcionalmente lista funciones skipped (no encontradas)
- **Violación (exit 1):** Lista de CRITICAL (hard delete en tabla con soft-delete columns) y MEDIUM (mezcla de patrones)

---

### 9. `validate-sql-params.js`

**Propósito:**  
Prevenir **inyección SQL** validando que todas las queries usen **parámetros posicionales** (`$1`, `$2`, etc.), no string concatenation o template literals.

**Qué revisa:**
- En `api-sgsi/src/queries/*.ts`:
  - Busca líneas con SELECT/INSERT/UPDATE/DELETE que además contengan:
    - Concatenación: `"..." + "..."` o `'...' + '...'`
    - Template literals: `${variable}`
  - Ignora líneas de comentarios e imports

**Dónde escanea:**
- `api-sgsi/src/queries/*.ts`

**Cómo ejecutar:**
```bash
node scripts/validate-sql-params.js
```

**Salida:**
- **Éxito (exit 0):** "✅ All SQL queries use parameterized queries"
- **Violación (exit 1):** Lista de líneas vulnerables por archivo y línea (contenido de la línea)

---

### 10. `validate-state-transitions.js`

**Propósito:**  
Validar que **máquinas de estado (workflows)** se enforcen correctamente, no permitiendo transiciones inválidas.

**Qué revisa:**
- En archivos `api-sgsi/src/services/*.service.ts`:
  - Busca lógica de estado/workflow (`status`, `state`, `workflow`, `Draft`, `Review`, `Approval`)
  - Si existe lógica de estado → exige un mapa de transiciones válidas (`validTransitions`, `allowedTransitions`, `transitionMap`, `stateMap`)
  - Detecta asignaciones directas `.status = ...` sin pasar por validación
- Si no encuentra el mapa de transiciones → falla

**Dónde escanea:**
- `api-sgsi/src/services/*.service.ts`

**Cómo ejecutar:**
```bash
node scripts/validate-state-transitions.js
```

**Salida:**
- **Éxito (exit 0):** "✅ State transitions appear to follow workflow rules"
- **Violación (exit 1):** Lista de servicios sin validación de transiciones o con asignaciones directas (archivo, línea, descripción del problema)

---

### 11. `validate-validation-engines.js`

**Propósito:**  
Validar que cada capa use el **engine de validación correcto**:
- **Frontend** (`app-sgsi`): Zod
- **Backend** (`api-sgsi`): Joi

**Qué revisa:**
- Recorre recursivamente `app-sgsi/src/` buscando imports de `joi` → falla (debe ser Zod)
- Recorre recursivamente `api-sgsi/src/` buscando imports de `zod` → falla (debe ser Joi)

**Dónde escanea:**
- `app-sgsi/src/**/*.ts`, `*.tsx`, `*.js`
- `api-sgsi/src/**/*.ts`, `*.js`

**Cómo ejecutar:**
```bash
node scripts/validate-validation-engines.js
```

**Salida:**
- **Éxito (exit 0):** "✅ Validation engines are correct (Zod in frontend, Joi in backend)"
- **Violación (exit 1):** Lista de archivos usando el engine incorrecto (archivo, línea, esperado vs. encontrado)

---

## Integración con Skills Claude

Cada script tiene una **skill hermana** en `.claude/skills/<nombre>/SKILL.md` que proporciona:
- Contexto detallado del problema
- Ejemplos ✅ (lo correcto) y ❌ (lo incorrecto)
- Referencias a `.rulesproyect`
- Cómo usarla interactivamente con Claude

El README de `scripts/` es el **índice técnico rápido** (qué hace cada código).  
Las skills son la **guía de uso para el equipo y Claude** (contexto, ejemplos, automatización).

---

## Ejecución en CI/CD

Si deseas integrar estos scripts en tu pipeline (GitHub Actions, etc.):

```bash
#!/bin/bash
set -e

# Ejecutar todos los scripts
node scripts/validate-component-size.js
node scripts/validate-jwt-config.js
node scripts/validate-middleware-order.js
node scripts/validate-mutation-lockdown.js
node scripts/validate-naming-conventions.js
node scripts/validate-soft-deletes.js
node scripts/validate-sql-params.js
node scripts/validate-state-transitions.js
node scripts/validate-validation-engines.js
node scripts/detect-pl-pgsql-business-logic.js

echo "✅ All validations passed!"
```

---

## Referencia Rápida por Regla

| Regla (`.rulesproyect`) | Script(s) |
|------------------------|-----------|
| Security Middleware Order | `validate-middleware-order.js` |
| JWT Configuration | `validate-jwt-config.js` |
| Component Size Limits | `validate-component-size.js` |
| Soft Deletes (no hard deletes) | `validate-soft-deletes.js` |
| SQL Parameterization (no injection) | `validate-sql-params.js` |
| State Machine Enforcement | `validate-state-transitions.js` |
| Naming Conventions | `validate-naming-conventions.js` |
| Mutation Lockdown (form inputs) | `validate-mutation-lockdown.js` |
| PL/pgSQL Purity (no business logic) | `detect-pl-pgsql-business-logic.js` |
| Validation Engines (Zod/Joi) | `validate-validation-engines.js` |
| Architecture Decisions (ADRs) | `analyze-architectural-decisions.js` |

---

## Notas

- **Todos los scripts son idempotentes:** se pueden ejecutar múltiples veces sin efectos secundarios (solo lectura).
- **Configuración mínima:** no requieren variables de entorno ni archivos de config.
- **Errores léxicos vs. semánticos:** detectan patrones de código, no hacen análisis semántico profundo (falsos positivos raros pero posibles).
- **Rutas relativas:** todas las rutas asumen ejecución desde la raíz del repositorio.
