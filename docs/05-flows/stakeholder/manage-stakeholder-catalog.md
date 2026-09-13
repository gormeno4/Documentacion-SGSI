---
id: FLOW-STK-001
type: flow
name: Gestionar Catálogo de Partes Interesadas
domain: DOM-STK
---

# Gestionar Catálogo de Partes Interesadas

**ID:** `FLOW-STK-001`

## Intención

Usuario gestiona el inventario completo de partes interesadas del análisis actual: crea, edita, elimina y asigna atributos (perfiles sugeridos, categorías, niveles de influencia, necesidades, expectativas, requisitos de seguridad de información, requisitos legales/regulatorios).

## Flujo de Usuario

1. Usuario navega a `/stake-holder`
2. Sistema carga análisis activo + lista de partes actuales
3. Usuario selecciona acción:
   - **Crear:** Clickea "Nueva Parte Interesada" → abre formulario
   - **Editar:** Selecciona parte de lista → abre formulario de edición
   - **Eliminar:** Clickea eliminar → confirma → soft-delete
4. Usuario completa formulario:
   - Nombre, categoría, nivel de influencia
   - Asigna perfil sugerido (opcional, desde catálogo)
   - Ingresa necesidades, expectativas
   - Ingresa requerimientos de seguridad de información
   - Mapea requisitos legales/regulatorios aplicables
5. Usuario guardar → POST `/stakeholder/upsert` o POST `/stakeholder/deleteById/:id`
6. Sistema retorna lista actualizada
7. UI renderiza tabla/cuadrante con nuevas partes

## API

### Entry Points

- **GET** `/stakeholder/getListByCustomerId` — carga lista + metadatos análisis actual
- **GET** `/stakeholder/getSuggestedProfiles` — carga catálogo de perfiles (usado en dropdown)
- **POST** `/stakeholder/upsert` — crear/editar parte
- **POST** `/stakeholder/deleteById/:id` — eliminar parte

### Cadena Técnica

**GET List:**
`/stakeholder/getListByCustomerId` → `StakeholderModel.getListByCustomerId(customerId)` → `sgsi.stakeholder_get_list_by_company_id()` → retorna JSON {analysis, stakeholderList}

**GET Profiles:**
`/stakeholder/getSuggestedProfiles` → `StakeholderModel.getSuggestedProfiles()` → `sgsi.v2_suggested_profile_stake_holder_get_all()` → retorna JSON [] de perfiles

**POST Upsert:**
`/stakeholder/upsert` → Joi validation → `StakeholderModel.upsert(customerId, userId, jsonData)` → `sgsi.stakeholder_upsert(data, customerId, userId)` → retorna JSON {analysis, stakeholderList}

**POST Delete:**
`/stakeholder/deleteById/:id` → `StakeholderModel.deleteById(id, customerId, userId)` → `sgsi.stakeholder_delete_by_id(id, customerId, userId)` → soft-delete + retorna lista actualizada

## Database

### Tables Modified

- `sgsi.stake_holder` — INSERT/UPDATE en create-edit, UPDATE deleted_at en delete
- `sgsi.stake_holder_needs` — INSERT/DELETE en upsert (necesidades)
- `sgsi.stake_holder_expectations` — INSERT/DELETE en upsert (expectativas)
- `sgsi.stake_holder_information_security` — INSERT/DELETE en upsert (seguridad info)
- `sgsi.stake_holder_legal_regulatory` — INSERT/DELETE en upsert (legales)
- `sgsi.stake_holder_analysis` — UPDATE updated_at/updated_by en delete

### Tables Read

- `sgsi.suggested_profile_stake_holder` — LEFT JOIN en list
- `sgsi.legal_regulatory` — INNER JOIN en list (catálogo externo)

## Dependencias Externas

- **Catálogo Perfil Sugerido:** `suggested_profile_stake_holder` — tabla referencial interna
- **Catálogo Legal:** `legal_regulatory` — tabla referencia externa (ownership ambiguo, posible DOM-LEG futuro)

## Consideraciones

- **Soft Delete:** Si se elimina una parte, sus sub-registros (needs, expectations, etc.) quedan con FK válida pero referenciando padre "muerto". No hay cascada.
- **Tenant Isolation:** Todos los endpoints validan `customerId` de sesión en controller → modelo → SQL.
- **Análisis Activo:** Solo se pueden editar/eliminar dentro de la versión activa que esté en `is_complete=false`. Si análisis está completado, es read-only.
- **Perfiles Sugeridos:** Son catálogo global, no por tenant; endpoint sin `customerId`.

## Estado

✓ CONFIRMED — 4 endpoints live, cadena completa hasta database.

