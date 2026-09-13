---
id: FLOW-ACT-011
type: flow
domain: DOM-ACT
name: Consultar / listar grupos de activos
entryPoint: "Menú 'Gestión por Grupos' desde /asset-inventory → /asset-inventory/groups; o toggle 'Vista por grupos' dentro de /asset-inventory"
frontend:
  route: /asset-inventory/groups
  pages:
    - app/(menu)/asset-inventory/groups/page.tsx
    - app/(menu)/asset-inventory/page.tsx (vista inline alternativa, mismo hook/endpoint)
  components:
    - components/functional/asset-inventory/groups/AssetGroupsList.tsx
    - components/functional/asset-inventory/asset-inventory.tsx (viewMode="groups")
  stores:
    - store/zustand/assetStore.ts
  services:
    - store/services/asset.Service.ts
technical:
  endpoint: EP-ASSET-GET-LIST-GROUP
status: CONFIRMED
externalDependencies: []
---

# Consultar / listar grupos de activos

## Propósito
Mostrar el listado de grupos de activos del cliente, con su clasificación CIA heredada (la más alta entre sus activos) y cantidad de activos vinculados.

## Entrada desde UI
Dos superficies de UI equivalentes, mismo hook y endpoint:
1. `/asset-inventory/groups` — vista dedicada (`AssetGroupsList`), con filtros por tipo/propietario/estado y paginación propia.
2. `/asset-inventory` con el toggle **"Vista por grupos"** — tabla inline dentro de `AssetInventory`, con panel de detalle lateral al seleccionar un grupo.

## Flujo funcional
1. Al montar cualquiera de las dos vistas, se llama `getAssetListGroupByCustomerId()`.
2. El frontend llama `GET /asset/getListGroupByCustomerId` (con `onlyActive` opcional por query string, no usado por ninguna de las dos vistas actuales — ambas cargan todos los grupos).
3. El backend resuelve el `customerId` del usuario autenticado y consulta la función de base de datos.

## Frontend
- `AssetGroupsList` (`/asset-inventory/groups`) y `AssetInventory` (`viewMode="groups"`, `/asset-inventory`).
- `useAsset().getAssetListGroupByCustomerId` → `assetStore` → `asset.Service.getListGroupByCustomerId()`.

## API
`GET /asset/getListGroupByCustomerId` — acceso `admin-or-usuario`.

## Backend
`routers/asset.ts` → `controllers/asset.ts#getListGroupByCustomerId` → `models/asset.ts#getListGroupByCustomerId` → `queries/asset.ts _getListGroupByCustomerId`.

## Database
`sgsi.v2_asset_group_get_list_by_customer_id(p_customer_id, p_only_active)` — solo lectura: `sgsi.asset_group`, con joins a `sgsi.base_asset_type`, `corvus.person` (propietario y administrador), `sgsi.cia_level` (x3), y subconsulta de conteo sobre `sgsi.asset` (`assetCount`).

## Reglas relevantes
- `p_only_active` filtra grupos inactivos si se pasa `true`; ninguna de las dos vistas de frontend inspeccionadas lo activa actualmente.

## Consideraciones
- **Duplicación de superficie de UI, no de relación técnica**: existen dos implementaciones de tabla de grupos (`AssetGroupsList` dedicado y la vista inline de `AssetInventory`) que consumen exactamente el mismo hook/endpoint/función — no hay dos fuentes de datos, solo dos renders distintos. Se documenta como hallazgo de posible consolidación futura, no como error.

## Trazabilidad
```mermaid
flowchart LR
  UI["AssetGroupsList (/asset-inventory/groups)\no vista inline (/asset-inventory)"] --> SVC["asset.Service.getListGroupByCustomerId()"]
  SVC --> API["GET /asset/getListGroupByCustomerId"]
  API --> CTRL["controllers/asset.ts#getListGroupByCustomerId"]
  CTRL --> MDL["models/asset.ts#getListGroupByCustomerId"]
  MDL --> FN["sgsi.v2_asset_group_get_list_by_customer_id()"]
  FN --> T1[("sgsi.asset_group")]
```
