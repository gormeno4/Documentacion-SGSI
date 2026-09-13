---
name: analyze-architectural-decisions
description: Analiza si se tomaron decisiones arquitectónicas y genera ADRs automáticamente en docs/adrs/ (según plantilla en docs/adrs/templates/template-decision.md). Usar al final de sesiones importantes o cuando pide crear decisiones.
---


## Descripción
Analiza si durante una sesión/PR se tomaron decisiones arquitectónicas, de seguridad, de base de datos o de integración relevantes. Si las hay, **genera automáticamente un ADR** (Architecture Decision Record) en `docs/adrs/` bajo la sección correspondiente (01-contexto-alcance, 02-gobierno, etc.) con el formato exacto del template.

## Tipo de Skill
**Analizador + Generador** (no es una validación, es un orquestador de documentación)

## Cuándo Usar
- Al final de una sesión de desarrollo importante
- Después de hacer cambios arquitectónicos
- Cuando se implementa una nueva patrón o approach
- Cuando se toma una decisión entre alternativas

## Cómo Funciona

### **Paso 1: Evaluación de Decisiones**
Revisa el contexto y pregunta:
- ¿Se tomó alguna decisión arquitectónica?
- ¿Se modificó seguridad/autenticación?
- ¿Se cambió modelo de datos?
- ¿Se integró una nueva tecnología?

### **Paso 2: Si Hay Decisiones**
Redacta un ADR automáticamente con:
- **Título y Número** secuencial (ej: ADR-0015)
- **Contexto**: Por qué surgió esta decisión
- **Problema**: Qué problema se intenta resolver
- **Opciones Evaluadas**: Alternativas consideradas
- **Decisión**: Qué opción se eligió y por qué
- **Consecuencias**: Trade-offs, ventajas, desventajas
- **Status**: `Accepted`, `Pending`, `Superseded`, etc.

### **Paso 3: Presentación al Usuario**
Resume el ADR creado y pide visto bueno antes de finalizar.

## Formato ADR

Sigue exactamente el template en `docs/adrs/templates/template-decision.md`:

```markdown
# ADR-[NUM] — [Título claro y descriptivo]

Estado: [PROPUESTO | ACEPTADO | OBSOLETO | SUPERADO]
Fecha: AAAA-MM-DD
Módulo / Menú: [Ej. Flujo documental > Edición de documentos]
Tipo de impacto: [Frontend | Backend | Base de Datos / Query | Regla de Negocio]

## Contexto

[Describe la situación, el problema o la necesidad actual. ¿Qué estaba sucediendo o qué requerimiento se solicitó?]

## Decisión

[Describe claramente la decisión técnica o funcional que se tomó. ¿Qué se hace y qué NO se hace?]

## Razón

- [Motivo 1]
- [Motivo 2]
- [Motivo 3]

## Consecuencias

Positivas:
- [Beneficio 1]
- [Beneficio 2]

Negativas:
- [Desventaja, limitación o costo 1]
- [Desventaja, limitación o costo 2]

## Referencias Técnicas (Opcional)

- **Frontend:** `app-sgsi/src/...`
- **Backend:** `api-sgsi/src/...`
- **Database / SQL:** `funciones_sgsi.sql`, tablas involucradas
- **Tickets / PRs:** [Referencia si aplica]
```

**Importante:**
- La numeración es por sección de menú (ej. `ADR-005-descripcion.md` va en `docs/adrs/07-flujo-documental/`)
- No es numeración global plana (`ADR-0001`, `ADR-0002`, etc.)
- Las 10 secciones son: `00-transversal`, `01-contexto-alcance`, `02-gobierno`, `03-inventario-activos`, `04-gestion-riesgos`, `05-tratamiento-riesgos`, `06-controles-soa`, `07-flujo-documental`, `08-eventos-incidentes`, `09-catalogos`

## Ejemplos

### ✅ Caso 1: ADR sobre Validación
**Decisión**: Usar Zod para frontend y Joi para backend en Barnard-SGSI
**ADR Generado**: ADR-0001: Standardized Validation Engines by Layer

### ✅ Caso 2: ADR sobre JWT
**Decisión**: Implementar dual-token (access 15min, refresh 7days)
**ADR Generado**: ADR-0002: Dual-Token JWT Architecture

### ✅ Caso 3: ADR sobre State Machine
**Decisión**: Enforce state transitions (Draft→Review→Approval)
**ADR Generado**: ADR-0003: Unbreakable State Machines

### ❌ Caso 4: Sin ADR
**Cambios**: Fix typo en componente, actualizar dependencia
**Resultado**: "No se identificaron decisiones arquitectónicas nuevas para documentar."

## Ubicación
- **ADRs**: `docs/adrs/<seccion>/` (una de las 10 subcarpetas de sección de menú)
- **Formato**: `ADR-[NUM]-titulo-descriptivo.md`
- **Numeración**: Por sección (no global). Ej. `docs/adrs/07-flujo-documental/ADR-005-foo.md`

## Regla
Siempre que exista una decisión que afecte la arquitectura, seguridad o integración, DEBE documentarse en un ADR antes de finalizar.

## Referencias
- Standard: [Markdown Architecture Decision Records](https://adr.github.io/)
- Template: `docs/adrs/templates/template-decision.md`
- Ubicación proyecto: `docs/adrs/` (10 subcarpetas organizadas por sección de menú)
