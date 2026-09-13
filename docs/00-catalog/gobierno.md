---
id: DOM-GOV
type: catalog
name: Gobierno del SGSI
---

# Gobierno del SGSI

## Resumen
Módulo que define quién es quién dentro del SGSI y cómo se comunica: información de la empresa, catálogo de áreas, mapeo del gobierno (Responsable del SGSI y Alta Dirección), comités, padrón de personas con su expediente documental y sus certificados de capacitación, catálogo de cargos con su descriptor formal, organigrama y Registro de Comunicaciones. Tres de sus entidades tienen ciclo de aprobación propio vía Doc-Flow (`CARGO`, `ORGANIGRAMA`, `COMMUNICATIONS_MATRIX`), y una de ellas —Cargos— mantiene una **cascada automática hacia Activos**: crear, editar o eliminar un cargo crea, sincroniza o da de baja un activo de información de tipo TA-13. Cierra el deslinde que `DOM-CTX` había dejado anotado sobre `sgsi.communications_matrix_analysis`, y la dependencia entrante genérica que `DOM-DOCFLOW` documentaba como "Gobierno (no documentado)". Sus funciones se reparten entre los esquemas `sgsi` y `corvus` — es el primer módulo documentado con functions en `corvus`.

## Frontend Views

| Vista | Ruta | Componente principal |
|---|---|---|
| Organización | `/governance/company` | `Company` (+ `Headquarters`) |
| Áreas | `/governance/area` | `Areas` |
| Roles y responsabilidades | `/governance/roles-responsibilities` | `RolesResponsibilities` → `GovernmentSection`, `ComitesSection`, `PositionSection` |
| Personas | `/governance/persons`, `/new`, `/[id]` | `Person`, `PersonDetails` (+ `PersonDocuments`, `PersonTrainings`) |
| Cargos | `/governance/positions`, `/[id]` | `Positions`, `PositionDetail` |
| Organigrama | `/governance/chart` | `Chart` |
| Matriz / Registro de Comunicaciones del SGSI | `/governance/sgsi-communications-log` | `SgsiCommunicationsLog` |
| Paso Gobierno del Wizard (segunda entrada de `FLOW-GOV-003`, no es Vista propia) | `/wizard/context/government` | `wizard/context/government.tsx` |

La sección completa es **admin-only en la UI**: la lista blanca para usuarios no admin (`app/(menu)/layout.tsx:272-284`) no contiene ninguna ruta `/governance/*`. Esto **no** coincide con el acceso de algunos routers — ver Hallazgos.

## Flows

| ID | Operación | Archivo |
|---|---|---|
| FLOW-GOV-001 | Consultar y editar la información de la empresa | [manage-company-info.md](../05-flows/governance/manage-company-info.md) |
| FLOW-GOV-002 | Gestionar Áreas | [manage-areas.md](../05-flows/governance/manage-areas.md) |
| FLOW-GOV-003 | Mapear el Gobierno del SGSI | [map-sgsi-government.md](../05-flows/governance/map-sgsi-government.md) |
| FLOW-GOV-004 | Registrar los Comités del SGSI | [manage-committees.md](../05-flows/governance/manage-committees.md) |
| FLOW-GOV-005 | Gestionar Personas | [manage-persons.md](../05-flows/governance/manage-persons.md) |
| FLOW-GOV-006 | Carga masiva de Personas | [import-persons.md](../05-flows/governance/import-persons.md) |
| FLOW-GOV-007 | Gestionar el expediente documental de una persona | [manage-person-documents.md](../05-flows/governance/manage-person-documents.md) |
| FLOW-GOV-008 | Registrar certificados de capacitación de una persona | [manage-person-training-certificates.md](../05-flows/governance/manage-person-training-certificates.md) |
| FLOW-GOV-009 | Gestionar Cargos | [manage-positions.md](../05-flows/governance/manage-positions.md) |
| FLOW-GOV-010 | Consultar el organigrama y enviarlo a aprobación | [view-org-chart.md](../05-flows/governance/view-org-chart.md) |
| FLOW-GOV-011 | Exportar el organigrama a PNG | [export-org-chart.md](../05-flows/governance/export-org-chart.md) |
| FLOW-GOV-012 | Gestionar el Registro de Comunicaciones del SGSI | [manage-communications-log.md](../05-flows/governance/manage-communications-log.md) |

Numeración consecutiva, sin huecos. Se partió de 16 candidatas en Checkpoint A y se consolidaron a 12 en Checkpoint B, siempre por precedente de los módulos ya congelados: la generación con IA y el envío/publicación vía Doc-Flow se pliegan dentro de la Operación de la entidad (como hizo `DOM-CTX` con FODA y el Resumen Ejecutivo), las tres capacidades del Registro de Comunicaciones se fusionan en una sola Operación multi-endpoint (como `manage-foda-analysis.md`), los modales de alta rápida de cargo y persona son invocaciones de `FLOW-GOV-009`/`FLOW-GOV-005` desde otra superficie (precedente `FLOW-ACT-008/014/016`), y la exportación a PNG se separa como Operación `clientSideOnly` (precedente `FLOW-SOA-005`).

## API

**36 endpoints vivos documentados**, repartidos en 10 routers: `/customer` (2), `/branch` (1), `/district` (1), `/rol` (1), `/area` (4), `/government` (2), `/staff` (2), `/person` (10), `/position` (6) y `/communications-matrix` (7). Índice completo y navegable por Operación en [`docs/06-technical/governance/endpoints/`](../06-technical/governance/endpoints/).

Acceso base por router (`api-sgsi/src/app.ts`): `admin-only` para `/customer`, `/branch`, `/district` y `/staff`; `admin-or-usuario` para `/rol`, `/area`, `/government`, `/person`, `/position` y `/communications-matrix`. Dentro de esos routers, `/government/upsert` y casi todas las escrituras de `/person` y `/position` añaden `verifyAdminOnly` por ruta; `/area` y `/communications-matrix` **no añaden ninguna** (ver Hallazgos).

**2 endpoints huérfanos**, sin nodo (ver Hallazgos): `GET /person/:personId/documents` y `GET /district/getById/:id`.
**5 endpoints deslindados hacia Catálogos**, vivos pero fuera de `DOM-GOV`: `POST /branch/upsert`, `GET /branch/getById`, `POST /branch/deleteById/:id`, `POST /staff/deleteById/:id`, `GET /staff/dependencies/:id`.

## Database

Esquemas **`sgsi` y `corvus`**. **44 functions vivas documentadas**: 36 ejecutadas directamente por un endpoint y 8 internas sin endpoint propio (`corvus.area_get_customer_id`, `corvus.v2_customer_person_upsert`, `corvus.v2_user_upsert_with_roles`, `sgsi.person_document_get_customer_id`, `sgsi.person_training_get_customer_id`, `sgsi.person_training_get_certificate_path`, `sgsi.v2_person_document_get_by_person_id`, `sgsi.v2_training_document_get_by_training_id`). Prefijos: `v2_position_*`, `v2_government_*`, `v2_staff_*`, `v2_communications_matrix_*`, `person_*`, `check_*` en `sgsi`; `v2_area_*`, `v2_person_*`, `v2_customer_person_*`, `v2_user_*`, `v2_branch_*`, `v2_rol_*` en `corvus`. Todas definidas en `funciones_sgsi.sql` / `funciones_corvus.sql` (raíz del repo). Índice completo en [`docs/06-technical/governance/functions/`](../06-technical/governance/functions/).

**34 tablas derivadas** (23 en `sgsi`, 11 en `corvus`). Tablas propias principales: `sgsi.position`, `sgsi.position_profile`, `sgsi.position_function`, `sgsi.position_responsibility`, `sgsi.position_risk_level`, `sgsi.staff`, `sgsi.person_staff`, `sgsi.person_document`, `sgsi.communications_matrix_analysis`, `sgsi.communications_matrix_row` y `corvus.area`. Tablas de otros dominios escritas desde aquí: `sgsi.asset` y `sgsi.asset_history` (cascada Cargo → Activo), `sgsi.person_training` (Capacitaciones) y `corvus.user` / `customer_user` / `user_rol` / `person_application` (identidad).

**Auditoría de migraciones.** Se compararon los cuerpos normalizados de todas las funciones del dominio presentes en `api-sgsi/sql/**` y `_database/migrations/**` contra el snapshot. Las **13** funciones de `sprint5/2_2026-09-07_cargo_persona_functions.sql` (migración cargo/persona → `customer_person`) están **idénticas** en el snapshot; `2026-06-02_asset_position_link.sql` y `ediciondocumentosfix.sql` también coinciden; `_database/migrations/004`, `005` y la variante de 4 argumentos de `2026-06-11_fix_person_delete_tenant_aware.sql` están correctamente **superadas** por el snapshot. **Ninguna función crítica del dominio está desactualizada**, a diferencia de lo ocurrido con la Matriz de Riesgo en Activos/Riesgos. Queda abierta la deuda de `sprint5/3_2026-09-07_drops_columnas_obsoletas.sql` (ver Hallazgos).

## Dependencias externas conocidas

| Dominio | Naturaleza de la dependencia | Dónde aparece |
|---|---|---|
| Flujo Documental (`doc-flow`) | Aprobación y publicación de tres `entity_type`: `CARGO` (`FLOW-GOV-009`), `ORGANIGRAMA` con `entity_id = customerId` (`FLOW-GOV-010`) y `COMMUNICATIONS_MATRIX` (`FLOW-GOV-012`). Mapping exacto en [`docs/00-catalog/docflow.md`](./docflow.md) (`FLOW-DOCFLOW-004`/`005`/`006`/`010`). Al publicar un `CARGO`, el controller de Doc-Flow reescribe `sgsi.position` llamando `models/position.ts#upsert`; para `COMMUNICATIONS_MATRIX`, `sgsi.doc_flow_publish` escribe directamente `sgsi.communications_matrix_analysis`. | FLOW-GOV-009, 010, 012 |
| Activos (`assets`) | `sgsi.v2_position_upsert` crea y sincroniza un activo de información TA-13 vinculado al cargo (`sgsi.asset` + `sgsi.asset_history`); `sgsi.v2_position_delete_by_id` lo da de baja. La relación es **estructural** (declarada en `tables:` de ambas functions), así que `sgsi.asset` queda navegable bottom-up desde Gobierno y desde `DOM-ACT`. | FLOW-GOV-009 |
| IA (`ai`) | `GET /ai/generate-position-description/:positionId` genera el descriptor del cargo (lee el contexto con `sgsi.v2_position_get_data_by_customer_id_to_ai` y delega en el servicio externo `/descripcioncargo`). El resultado se mapea al formulario sin guardarse. | FLOW-GOV-009 |
| Archivos (`file`) | Documentos de persona (`entity_type='person-document'`), certificados de capacitación (`'training-certificate'`) e imagen del organigrama (`'organigrama'`), todos vía `FileModel.upsert` desde Node. | FLOW-GOV-007, 008, 010 |
| Capacitaciones (`training`) | Ownership de `sgsi.person_training`: la asignación persona↔capacitación la crea el módulo Capacitaciones (`/planning-resources/training`); Gobierno solo escribe las columnas de certificado y resultado. | FLOW-GOV-008 |
| Correo (`email`) | Contraseña aleatoria y correo de bienvenida al crear una persona con roles (`apiEmailInstance`/`sendTemplateEmail`, servicio `api-email`). | FLOW-GOV-005, 006 |
| Wizard (`wizard`) | El paso `/wizard/context/government` usa los mismos endpoints que `FLOW-GOV-003`; además `welcome.tsx`, `context.tsx` y `FormalizationDashboard.tsx` leen el gobierno para calcular el progreso, y los modales compartidos del Wizard invocan `EP-POSITION-UPSERT` y `EP-PERSON-UPSERT`. | FLOW-GOV-003 |

## Hallazgos registrados (no corregidos, fuera de alcance de esta fase)

### Seguridad — Tenant isolation (usuario de Customer A accede/modifica datos de Customer B)

| # | Endpoint | Evidencia | Impacto | Severidad |
|---|---|---|---|---|
| T1 | `POST /person/upsertDocument/:personId` | `controllers/person.ts:198-252` nunca compara `personId` con `dataUser(req).customerId` | Adjunta un documento al expediente de una persona de otro cliente; escribe `sgsi.person_document` y `sgsi.file` con el `customer_id` del atacante | **Crítica** |
| T2 | `POST /person/upsertTrainingCertificate/:personTrainingId` | `controllers/person.ts:303-367` no valida, pese a que el helper `_getTrainingCustomerId` (`queries/person.ts:47`) existe y se usa en el borrado | Sobrescribe archivo, % de aprobación, asistencia y fecha de un `person_training` de otro cliente | **Alta** |
| T3 | `GET /position/getById/:id` | Ni `controllers/position.ts:65-82` ni `sgsi.v2_position_get_by_id` filtran por `customer_id` | Lee la ficha completa de un cargo de otra empresa (código, objetivo, perfil, funciones, responsabilidades, activo vinculado) | **Alta** |
| T4 | `GET /communications-matrix/analysis/version/:id` | Ni `controllers/communicationsMatrix.ts:136-153` ni la función validan. Asimetría frente a `get_versions`, que sí filtra | Lee el plan de difusión completo de otra empresa | **Alta** |
| T5 | `GET /person/dependencies/:id` | `controllers/person.ts:688-704` no valida y `sgsi.check_person_dependencies` solo recibe `p_person_id`. Asimetría frente a `/area/dependencies` y `/position/dependencies` | Enumera flujos, activos, capacitaciones y documentos de una persona de otra empresa | **Media-Alta** |
| T6 | `GET /person/:personId/documents` | `corvus.person_get_customer_id(uuid)` hace `LIMIT 1` sin `deleted_at IS NULL` ni `ORDER BY`: para una persona multiempresa devuelve una arbitraria. El overload correcto de 2 argumentos existe y nadie lo usa | Validación de tenant débil (falsos positivos/negativos) | **Baja** — el endpoint es huérfano |

### Seguridad — Authorization / Role enforcement (la UI oculta Gobierno a no-admin; el backend no)

**3 SECURITY MISMATCH confirmados** (sin `verifyAdminOnly` y sin ningún consumidor no-admin):
- `POST /area/upsert`, `POST /area/deleteById/:id`, `GET /area/dependencies/:id` — un usuario sin rol Admin puede crear, editar (y resucitar) y eliminar áreas.
- `POST /communications-matrix/row/upsert`, `DELETE /communications-matrix/row/deleteById/:id`, `POST /communications-matrix/analysis/complete`, `POST /communications-matrix/analysis/new-version` — un usuario sin rol Admin puede editar el plan de difusión, crear versiones y **marcar una versión como publicada**.
- `POST /person/upsertDocument/:personId` — única ruta de escritura de `/person` sin `verifyAdminOnly` (se acumula con T1).

**No son mismatch** (acceso `admin-or-usuario` intencional, con consumidor no-admin verificado): `GET /area/getListByCustomerId` y `GET /position/getById/:id` (`PositionPreview.tsx` en `/doc-flow/inbox`, ruta permitida a no-admin), `GET /communications-matrix/analysis/version/:id` (`CommunicationsMatrixPreview.tsx`, ídem), `GET /person/getById` (`/profile`), `GET /person/getListByCustomerId`, `GET /position/risk-levels` y `GET /rol/getList` (catálogos sin datos de cliente).

**Nota consolidada — 2 casos AMBIGUOUS**: `GET /government/getByCustomerId` y `GET /communications-matrix/getByCustomerId` + `GET /communications-matrix/analysis/versions` son lecturas correctamente scoped por `customer_id` del token, sin `verifyAdminOnly` y sin consumidor no-admin identificado. Podrían ser deliberadas para el rol aprobador. **No hay evidencia suficiente para clasificarlas como vulnerabilidad** y no se hace.

### Divergencia funcional activa — `corvus.check_area_dependencies`
Cuenta las personas de un área sobre `corvus.person.area_id`, columna que la migración **sprint5** dejó de escribir (`corvus.v2_person_upsert` ya no la actualiza; el área por empresa vive en `corvus.customer_person.area_id`, y el backfill de `sprint5/1` copió los valores **hacia** `customer_person` dejando la columna origen congelada). Consecuencia: para toda persona creada o reasignada después de esa migración el chequeo **no la cuenta**, de modo que `POST /area/deleteById/:id` puede **permitir eliminar un área que sí tiene personas asignadas** (el bloqueo solo falla si además el área no tiene activos, documentos ni cargos, que sí se cuentan correctamente). Ver `FLOW-GOV-002`.

### Deuda legacy con riesgo de bloqueo — snapshot del Organigrama
`sgsi.v2_document_workflow_snapshot_organigrama` (function de `DOM-DOCFLOW`, `funciones_sgsi.sql:16864`) lee `corvus.person.position_id`, la misma columna congelada, mientras que el organigrama en pantalla usa `corvus.customer_person.position_id`. Se verificó que **hoy no hay impacto funcional**: ningún consumidor lee `data.persons[]` del snapshot (tanto `OrganigramaPreview` como `document-preview.tsx` renderizan solo `organigramaImageBase64`). Clasificación: **Legacy + Technical Debt**, no divergencia activa. El riesgo es futuro: al ejecutar el `DROP COLUMN` pendiente de `sprint5/3_2026-09-07_drops_columnas_obsoletas.sql`, la función fallará y `models/doc-flow.ts:148-150` lanzará `badImplementation`, **bloqueando todo envío de organigrama a aprobación**. Otras funciones vivas que leen esas columnas congeladas y también se romperían: `sgsi.v2_dashboard_get_by_customer_id` (dominio Dashboard, fuera de alcance).

### Publicación redundante del Registro de Comunicaciones
En la ruta normal, `sgsi-communications-log.tsx:238-239` llama `publishProcess` (Doc-Flow) y **a continuación** `markComplete` (local): ambas escriben `is_complete`, `completed_by`, `completed_at` y `justification` sobre la misma fila. `doc_flow_publish` resuelve la justificación con `COALESCE(param, paso APROBADO, actual)`; `v2_communications_matrix_analysis_mark_complete` con `NULLIF(TRIM(...),'')`, por lo que puede sobrescribirla con `NULL`. Además, `mark_complete` selecciona la fila por `customer_id + is_active`, **no** por el `entity_id` del proceso. En la ruta de *reintento* (proceso `FINALIZADO` con `is_complete = false`) `markComplete` es el **único** mecanismo, así que la redundancia no es eliminable sin decidir antes qué pasa con ese camino. Clasificación: **Technical Debt + Bug potencial**. Ver `FLOW-GOV-012`.

### Guardas de backend más débiles que las de la UI (divergencia funcional)
`v2_communications_matrix_row_upsert` y `..._row_delete_by_id` solo bloquean por `is_complete`; **no consultan el estado del proceso Doc-Flow**, así que una versión en `EN_APROBACION` sigue siendo mutable por API. `..._analysis_create_new_version` desactiva la versión vigente sin comprobar si tiene un proceso abierto.

### Endpoints huérfanos (cadena técnica completa, sin consumidor UI) — no se generaron nodos
- `GET /person/:personId/documents` — router → controller → model → `sgsi.v2_person_document_get_by_person_id`, con acción de store (`personStore.ts:294`) y de hook (`usePerson.tsx:36/64`), pero **cero call-sites en componentes**: `PersonDocuments.tsx:74-77` lee `currentPerson.documents` del payload de `getById`.
- `GET /district/getById/:id` — acción de store (`districtStore.ts:43`) sin ningún consumidor en componentes.

### Functions huérfanas (0 consumidores TypeScript, 0 llamadas SQL) — no se generaron nodos
- `sgsi.v2_person_get_by_id(uuid)` (`funciones_sgsi.sql:22225`) — duplicado legacy del `corvus.*` vivo; lee columnas congeladas.
- `sgsi.v2_person_get_list_by_customer_id(uuid)` (`:22258`) — ídem.
- `sgsi.person_get_list_by_company_id(uuid)` (`:6813`) — ídem; solo sobrevive citada en un comentario de `v2_person_delete_by_id`.
- `corvus.v2_company_get_by_id(uuid)` (`funciones_corvus.sql:23591`) y `corvus.v2_company_update(uuid,uuid,text)` (`:23644`) — par legacy inalcanzable desde `api-sgsi`: `/customer/upsert` usa `sgsi.v2_customer_upsert`, no `v2_company_update`. `v2_company_get_by_id` además lee `per.position_id`.

### Overloads muertos — no se generaron nodos
- `sgsi.v2_communications_matrix_analysis_mark_complete(uuid, uuid)` (`funciones_sgsi.sql:13362`) — el modelo llama al de 3 argumentos.
- `corvus.v2_person_delete_by_id(uuid, uuid, uuid)` (`funciones_corvus.sql:23927`) — el modelo llama al de 4 argumentos; **este además no valida dependencias**.
- `corvus.person_get_customer_id(uuid, uuid)` (`funciones_corvus.sql:17554`) — creado por `ediciondocumentosfix.sql`, cero consumidores TS y SQL.
- `sgsi.v2_customer_upsert(uuid, uuid, varchar)` (`funciones_sgsi.sql:14808`) — convive con el overload `text`; la query `SELECT sgsi.v2_customer_upsert($1,$2,$3)` envía parámetros de tipo `unknown` y PostgreSQL resuelve al tipo preferido de la categoría string (`text`), dejando el `varchar` inalcanzable. Solo lee el esquema de payload antiguo. `status: PARTIAL` — regla de resolución verificada por documentación de PostgreSQL, no ejecutada contra la base.

### Componentes de frontend huérfanos — no forman parte de ninguna Operación
`governance/company/` contiene 5 archivos que **ningún import referencia** (~1.619 líneas): `needs.tsx` (306), `expectations.tsx` (317), `information-security.tsx` (324), `legal-regulatory.tsx` (430) y `select-laws-modal.tsx` (242). Quedaron superados por sus equivalentes en `components/functional/stake-holder/` (`quadrant-edit-needs`, `quadrant-edit-expectations`, `quadrant-edit-security`, `quadrant-edit-legal`, `select-laws-modal`). La pantalla `/governance/company` solo renderiza `company.tsx` + `headquarters.tsx`.

### `useChart` stub — mecanismo de bloqueo inalcanzable
`app-sgsi/src/store/hooks/useChart.tsx` es un stub que devuelve siempre `{ isLocked: false, lockReason: null, organigramWorkflow: null }`. Lo consumen **6 componentes** que basan en él `disabled`, tooltips y guardas de envío: `positions/positions.tsx:51`, `positions/position-detail.tsx:120-185`, `persons/person.tsx:68`, `persons/person-details.tsx:103/361/743/759`, `organization/staff/staff.tsx:55` y `organization/staff/staff-modal.tsx:56`. En consecuencia, **todo el bloqueo "El organigrama está bloqueado para cambios" es código muerto**: nunca se activa. Se documenta explícitamente para no describir una regla de negocio inexistente.

### Otra deuda técnica registrada
- `controllers/position.ts:8` importa `* as CustomerModel` y nunca lo usa.
- `controllers/government.ts:21` deja un `console.log("[DEBUG]…")` con `JSON.stringify` del payload completo en código desplegado.
- `models/person.ts#getTrainingPersonById` está exportado y **ningún controller lo invoca**.
- Verbos HTTP inconsistentes: las bajas usan `POST .../deleteById/:id` salvo la de filas de la matriz, que usa `DELETE`.
- `sgsi.v2_position_get_by_customerid` invoca `v2_position_get_by_id` una vez por cargo (N+1 en SQL).
- `sgsi.v2_position_upsert` tiene el `base_asset_type_id` de TA-13 hardcodeado como literal UUID.
- Cargos legacy sin activo vinculado: la rama UPDATE de `v2_position_upsert` nunca crea el activo faltante; la migración correctiva `2026-07-06_backfill_position_asset_link.sql` está acotada a un solo cliente y con marcadores "REEMPLAZAR AQUÍ".
- `corvus.v2_area_upsert` resucita áreas dadas de baja (`deleted_at = NULL` en la rama UPDATE).
- Lógica duplicada: 3 modales de alta de cargo (`positions/position-modal.tsx`, `roles-responsibilities/position-modal.tsx`, `wizard/shared/PositionModal.tsx`) y 2 de alta manual de persona.
- `governance/persons/` contiene `person-details.tsx` (la página) y `PersonDetails.tsx` (una sub-sección): colisión de import latente en filesystems case-insensitive.
- `chart.tsx:81` lee `customer` del store pero nunca dispara `getCustomerById()`: el PNG exportado cae al nombre `organigrama_empresa.png`.
- `corvus.v2_user_upsert_with_roles` contiene `RAISE NOTICE` de depuración en el código desplegado.

### Correcciones de conteo respecto de Checkpoint B
- **Functions: 42 → 44.** Al derivar los YAML del SQL real aparecieron dos functions internas vivas que el diseño no había contabilizado: `corvus.v2_user_upsert_with_roles` (invocada por `v2_person_upsert` cuando el payload trae roles) y `sgsi.v2_training_document_get_by_training_id` (invocada por `training_update_training_documents`, `person_training_delete_certificate` y `v2_customer_person_get_list_by_customer_id`). El reparto pasa de 36 DIRECT + 6 INTERNAL a **36 DIRECT + 8 INTERNAL**. Operaciones, endpoints, tablas y dependencias externas quedaron exactamente como en el diseño.
