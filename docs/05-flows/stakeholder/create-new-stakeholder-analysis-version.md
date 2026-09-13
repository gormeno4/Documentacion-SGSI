---
id: FLOW-STK-003
type: flow
name: Crear Nueva Versión del Análisis
domain: DOM-STK
---

# Crear Nueva Versión del Análisis

**ID:** `FLOW-STK-003`

## Intención

Usuario inicia una nueva ronda de análisis de partes interesadas mediante creación de una versión versionada: sistema incrementa número de versión, copia todas las partes interesadas de la versión anterior como borrador editable, y la nueva versión queda activa pero no completada.

## Flujo de Usuario

1. Usuario visualiza análisis completado/publicado actual
2. Clickea botón "Crear Nueva Versión"
3. Abre dialog de confirmación: "¿Crear nueva versión? Se copiarán todas las partes interesadas existentes."
4. Usuario confirma
5. System POST `/stakeholder/analysis/new-version`
6. Sistema crea `stake_holder_analysis` nuevo con:
   - `version = MAX(version) + 1`
   - `is_complete = false`
   - `is_active = true`
   - `created_by = userId`
7. Copia todas las partes (`stake_holder`) + sub-registros de versión anterior a nueva versión
8. Retorna lista actualizada con nueva versión
9. UI renderiza nueva versión como editable (borrador)

## Siguiente Paso

Usuario puede:
- Editar partes en nueva versión (FLOW-STK-001)
- Completar nueva versión (FLOW-STK-002)
- Ver historial de versiones (FLOW-STK-004)

## API

### Entry Point

- **POST** `/stakeholder/analysis/new-version` — crear nueva versión

### Cadena Técnica

`POST /stakeholder/analysis/new-version` → `StakeholderModel.createNewVersion(customerId, userId)` → `sgsi.v2_stakeholder_analysis_create_new_version(customerId, userId)` → INSERT stake_holder_analysis (nueva versión) + INSERT stake_holder (copia de partes) + INSERT subregistros

## Database

### Tables Modified

- `sgsi.stake_holder_analysis` — INSERT nueva versión
- `sgsi.stake_holder` — INSERT copias de partes de versión anterior
- `sgsi.stake_holder_needs` — INSERT copias
- `sgsi.stake_holder_expectations` — INSERT copias
- `sgsi.stake_holder_information_security` — INSERT copias
- `sgsi.stake_holder_legal_regulatory` — INSERT copias

### Versionado

| Parámetro | Valor |
|-----------|-------|
| `version` | = MAX(version de cliente) + 1 |
| `is_complete` | false |
| `is_active` | true |
| `customer_id` | del cliente |
| `created_by` | userId actual |

### Índices Utilizados

- `stake_holder_analysis_customer_idx` — búsqueda de versión anterior
- `stake_holder_analysis_active_idx` — búsqueda de versión activa

## Consideraciones

- **Copia Completa:** Se copian TODAS las partes + subnodos. No existe "copia selectiva".
- **Nueva Versión Activa:** Versión anterior permanece con `is_active=true` pero `is_complete=true`; la nueva versión toma `is_active=true, is_complete=false`. Solo una versión está realmente "editable" en la UI por consulta de is_complete=false.
- **Independencia:** Ediciones en nueva versión NO afectan versión anterior (datos copiados, no referenciados).
- **Tenant Isolation:** Validación de `customerId` en controller → modelo → SQL.
- **Límite de Versiones:** Sin límite explícito de versiones; sistema solo incrementa.

## Estado

✓ CONFIRMED — 1 endpoint live, función SQL con INSERT/SELECT complejos.

