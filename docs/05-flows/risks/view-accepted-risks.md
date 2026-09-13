---
id: FLOW-RSK-007
type: flow
domain: DOM-RSK
menuSection: "Gestión de Riesgos"
name: Consultar riesgos aceptados
entryPoint: "Menú Gestión de Riesgos → Riesgos Aceptados → /risk-management/accepted-risks"
frontend:
  route: /risk-management/accepted-risks
  pages:
    - app/(menu)/risk-management/accepted-risks/page.tsx
  components:
    - components/functional/risk-management/accepted-risks/index.tsx
    - components/functional/risk-management/accepted-risks/group-accepted-risks.tsx
  stores: []
  services: []
technical: null
status: CONFIRMED
clientSideOnly: true
externalDependencies: []
---

# Consultar riesgos aceptados

## Propósito
Mostrar, en una vista de solo lectura, los escenarios de riesgo por grupo cuyo tratamiento definido tiene estrategia "aceptar".

## Entrada desde UI
Menú **Gestión de Riesgos → Riesgos Aceptados** → `/risk-management/accepted-risks`.

## Flujo funcional
1. `GroupAcceptedRisks` llama `useGroupRiskTreatment().fetchList()` — el mismo `GET /group-risk-treatment/getList` que usa FLOW-RSK-010/011 para el Plan de Tratamiento.
2. Sobre esa lista completa (todos los grupos, todos los escenarios con tratamiento definido), filtra en el cliente los que tienen `treatment.strategy === 'accept'`.
3. No existe ningún filtro server-side por estrategia, ni un concepto "aceptado" almacenado como tal en la base de datos — es puramente una proyección de lectura sobre datos de Tratamiento.

## Frontend
- `GroupAcceptedRisks` → `useGroupRiskTreatment().{risks, fetchList}` (filtro `strategy === 'accept'` en memoria).

## API
No aplica — no se declara `technical.endpoint`. Reutiliza la respuesta de `GET /group-risk-treatment/getList`, documentada como parte de FLOW-RSK-010/011.

## Backend
No aplica — ver `docs/06-technical/risks/endpoints/EP-GROUP-RISK-TREATMENT-GET-LIST.yaml`.

## Database
No aplica — ver `FN-V2-GROUP-RISK-TREATMENT-GET-LIST`.

## Reglas relevantes
- Un escenario aparece aquí si y solo si `risk.treatment.strategy === 'accept'` en la respuesta de `/group-risk-treatment/getList`, evaluado en el cliente.

## Consideraciones
- Es el equivalente en Riesgos de una Operación 100% client-side de Activos (como Exportar a Excel): no llama backend propio, solo reutiliza datos ya traídos por otra Operación. Se marca `technical: null` + `clientSideOnly: true`, sin inventar un endpoint propio.
