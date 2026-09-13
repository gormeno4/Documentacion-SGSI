---
type: component
name: Dashboard SGSI
slug: dashboard-sgsi
classification: TRANSVERSAL READ-ONLY AGGREGATOR
route: /dashboard
status: TECHNICAL TRACEABILITY COMPLETE
summary: Panel de control visual que agrega métricas, gráficos y estados de múltiples dominios del SGSI. Visualización pura sin operaciones propias.
convergences:
  - DOM-ACT
  - DOM-CTX
  - DOM-RSK
  - DOM-DOCFLOW
  - DOM-INIT
  - DOM-GOV
  - DOM-SOA
---

# Dashboard SGSI — Documentación Técnica

## Clasificación

**NO DOMAIN — NO FLOW — TRANSVERSAL READ-ONLY AGGREGATOR**

Dashboard es un agregador transversal que:
1. Centraliza métricas y visualizaciones de múltiples dominios
2. Proporciona vistas ejecutivas de riesgos, activos, documentos y operaciones
3. No ejecuta operaciones propias, solo lee y visualiza

## Endpoints

| Endpoint | Purpose |
|---|---|
| `GET /dashboard/summary` | Resumen ejecutivo: conteos por estado y dominio |
| `GET /dashboard/getDashboardByCustomerId` | Dashboard personalizado por cliente |
| `GET /dashboard/getRelationsByAssetId` | Relaciones de un activo en dashboard |
| `GET /dashboard/getAllRelationsByCustomerId` | Todas las relaciones visualizables |

**Access:** `admin-or-usuario` (authenticated users)

## Funciones SQL

### Principales (Endpoints)

- **FN-DASHBOARD-SUMMARY** — `sgsi.dashboard_summary(customer_id)`
  - Retorna conteos agregados y métricas globales
  
- **FN-DASHBOARD-GET** — `sgsi.dashboard_get(customer_id)`
  - Dashboard personalizado por cliente
  
- **FN-DASHBOARD-RELATIONS-ASSET** — `sgsi.dashboard_relations_by_asset(customer_id, asset_id)`
  - Relaciones visuales de activos
  
- **FN-DASHBOARD-RELATIONS-ALL** — `sgsi.dashboard_all_relations(customer_id)`
  - Conjunto completo de relaciones para grafos

## Convergencias

Dashboard solo lee datos de otros dominios:

| Dominio | Lectura | Visualización |
|---|---|---|
| DOM-ACT | Activos, inventarios | Recuento, estados |
| DOM-CTX | Scope, KPIs, objetivos | Métricas contextuales |
| DOM-RSK | Matriz de riesgos | Heatmap, niveles |
| DOM-DOCFLOW | Documentos, procesos | Estado actual |
| DOM-INIT | Iniciativas | Timeline visual |
| DOM-GOV | Gobierno, posiciones | Organigrama |
| DOM-SOA | Controles, SoA | Cobertura |

**Conclusión:** Dashboard NO ejecuta ninguna operación. Solo visualiza datos de otros dominios.

## Security / Access Control

**Niveles verificados:**

1. **Router:** Acceso base `admin-or-usuario` en `/dashboard`
2. **Controller:** Extrae `customerId` del JWT
3. **SQL:** Filtros por `customer_id` en todos los queries
4. **Ownership:** Acceso personalizado por tenant

**Tenant isolation:** CONFIRMED (validado en 3 capas)

## Estadísticas

- **Endpoints:** 4 (GET only, read-only)
- **Functions:** 4 (all read-only)
- **Mutations:** 0
- **Converges to:** 7 frozen domains
- **Converges from:** 10+ dominios vía lectura

## Archivos

```
docs/06-technical/dashboard/
├── README.md (este archivo)
├── endpoints/
│   ├── EP-DASHBOARD-SUMMARY.yaml
│   ├── EP-DASHBOARD-GET.yaml
│   ├── EP-DASHBOARD-RELATIONS-ASSET.yaml
│   └── EP-DASHBOARD-RELATIONS-ALL.yaml
└── functions/
    ├── FN-DASHBOARD-SUMMARY.yaml
    ├── FN-DASHBOARD-GET.yaml
    ├── FN-DASHBOARD-RELATIONS-ASSET.yaml
    └── FN-DASHBOARD-RELATIONS-ALL.yaml
```

## Observaciones Arquitectónicas

**¿Por qué no es un dominio?**
- Sin operaciones propias (0 mutaciones)
- Sin estados internos
- No posee tablas
- Solo agrega datos de otros dominios

**¿Por qué es transversal?**
- Visualiza datos de 7+ dominios
- Punto de entrada unificado para métricas ejecutivas
- Visualización read-only de estados globales

---

**Status:** TECHNICALLY DOCUMENTED (PHASE 3 complete)

