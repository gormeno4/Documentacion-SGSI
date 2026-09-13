---
id: FLOW-STK-002
type: flow
name: Completar Análisis de Partes Interesadas
domain: DOM-STK
---

# Completar Análisis de Partes Interesadas

**ID:** `FLOW-STK-002`

## Intención

Usuario marca el análisis de partes interesadas actual como "completado" (listo para aprobación/revisión), guardando una justificación opcional y transitando el estado local.

## Flujo de Usuario

1. Usuario ha editado todas las partes interesadas en el análisis actual
2. Clickea botón "Completar Análisis"
3. Abre dialog con campo de justificación (opcional, máx 255 caracteres)
4. Usuario ingresa justificación y clickea "Confirmar"
5. System POST `/stakeholder/analysis/complete` con justificación
6. Estado transiciona: `is_complete=false` → `is_complete=true`
7. Análisis queda completado pero sigue siendo la versión activa (`is_active=true`)
8. UI muestra estado "Completado" o similar

## Siguiente Paso (opcional)

Después de completar, usuario puede:
- **Flujo Documental:** Clickear "Enviar a Aprobación" → crea proceso DocFlow → flujo de aprobación/publicación (operación transversal de FLOW-DOCFLOW-004/006, no de STK)
- **Nueva Versión:** Clickear "Crear Nueva Versión" → operación FLOW-STK-003

## API

### Entry Point

- **POST** `/stakeholder/analysis/complete` — marcar análisis como completado

### Cadena Técnica

`POST /stakeholder/analysis/complete` → Joi schema validation (justification) → `StakeholderModel.markComplete(customerId, userId, justification)` → `sgsi.v2_stakeholder_analysis_mark_complete(customerId, userId, justification)` → UPDATE stake_holder_analysis SET is_complete=true, completed_at=now(), completed_by=userId, justification=param

## Database

### Tables Modified

- `sgsi.stake_holder_analysis` — UPDATE is_complete, completed_at, completed_by, justification

### Columns Affected

| Columna | De | A |
|---------|----|----|
| `is_complete` | false | true |
| `completed_at` | NULL | NOW() |
| `completed_by` | NULL | userId |
| `justification` | NULL o existing | justification param |
| `updated_at` | previous | NOW() |
| `updated_by` | previous | userId |

## Consideraciones

- **Estado Local:** Este es un estado LOCAL. La versión sigue siendo editable técnicamente si el usuario vuelve a la pantalla, pero la UI renderiza como read-only.
- **vs DocFlow Publish:** NO es equivalente a publicar vía DocFlow. Publish hace `is_active=true` + `is_complete=true` + transiciona estado global. Complete solo hace local.
- **Reversibilidad:** Complete NO es reversible; no existe endpoint para "descomplete". Usuario debe crear FLOW-STK-003 (nueva versión) si necesita re-editar.
- **Tenant Isolation:** Validación de `customerId` en controller → modelo → SQL.

## Cross-Domain

- **DocFlow Entrada:** Usuario puede opcionalmente disparar FLOW-DOCFLOW-004 (crear proceso) desde UI después de completar. Registro: dependencia saliente, no técnica.

## Estado

✓ CONFIRMED — 1 endpoint live, función SQL 3-param version.

