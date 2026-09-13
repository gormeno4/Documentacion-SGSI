# SGSI Traceability Standard v1

> Estándar congelado a partir del piloto del módulo **Activos** (`docs/00-catalog/activos.md`, `docs/05-flows/assets/`, `docs/06-technical/assets/`, `docs/explorer/`). Describe lo que ya existe y funciona — no propone arquitectura nueva. Cualquier módulo futuro (Riesgos, Doc-Flow, Wizard, Organización, etc.) debe seguir exactamente este modelo.

---

## 1. Objetivo del estándar

Permitir navegar la trazabilidad técnica y funcional de cualquier módulo del SGSI en ambos sentidos:

```
Operación (UI/Frontend) → Endpoint (API) → Function (Database) → Table
Table → Function → Endpoint → Operación
```

usando **Markdown + YAML como única fuente de verdad**, sin depender de HTML escrito a mano ni de interpretar código en tiempo real, y con una capa visual (el Explorer) que solo lee esa documentación.

---

## 2. Principios

1. **Markdown + YAML son la fuente documental. Mermaid es solo visualización** — nunca se deriva una relación de un diagrama.
2. **Solo se documenta como hecho lo verificado leyendo código real** (`status: CONFIRMED`). Lo no verificado se marca `PARTIAL` / `AMBIGUOUS` / `NOT FOUND`, nunca se adivina ni se sube de categoría sin evidencia.
3. **Una relación técnica se declara una sola vez** y se referencia por ID — nunca se repite en prosa estructurada ni se mantiene a mano en sentido inverso.
4. **Cada Operación es autosuficiente**: se lee sin necesitar abrir otra Operación.
5. **No se documenta código productivo modificándolo.** El proceso de documentación es de solo lectura sobre `app-sgsi`, `api-sgsi` y el resto de servicios.
6. **Un módulo se documenta completo o no se documenta.** No se mezclan módulos a medio camino en el mismo pase.
7. **El Explorer no es fuente de verdad.** Es una capa de lectura sobre `docs/**`; si el Explorer y la documentación difieren, la documentación tiene siempre la razón.

---

## 3. Estructura de carpetas

```
docs/
├── 00-catalog/
│   └── <modulo>.md                    ← ficha de entrada del módulo (una por módulo)
├── 05-flows/
│   └── <modulo>/                      ← una carpeta por módulo
│       └── <operacion>.md             ← una Operación por archivo
└── 06-technical/
    └── <modulo>/
        ├── endpoints/
        │   └── EP-<ENTIDAD>-<ACCION>.yaml
        └── functions/
            └── FN-<NOMBRE_REAL>.yaml
```

Ejemplo real (Activos): `docs/00-catalog/activos.md`, `docs/05-flows/assets/*.md`, `docs/06-technical/assets/{endpoints,functions}/*.yaml`.

Reglas de esta estructura (no negociables):
- No se crean archivos por tabla — las tablas son metadata (`tables:`) dentro del YAML de cada function, y el Explorer las materializa como nodos derivados.
- No se crean archivos por router/controller/model individual — son campos planos dentro del YAML del endpoint, no nodos propios, mientras la relación endpoint→controller→model sea 1:1.
- No existe una carpeta "external" — las dependencias externas se declaran inline (ver §9), nunca como archivos propios de otro módulo.

El prototipo visual vive aparte, en `docs/explorer/` (parser + validador + smoke test + UI), y es común a todos los módulos — no se crea un Explorer por módulo.

---

## 4. Convención de IDs

| Entidad | Patrón | Ejemplo real | Se define en |
|---|---|---|---|
| Módulo (dominio) | `DOM-<SIGLA>` | `DOM-ACT` | `id:` del catálogo, `domain:` de cada Operación |
| Operación | `FLOW-<SIGLA>-<NNN>` (secuencial, 3 dígitos) | `FLOW-ACT-003` | front matter de cada `.md` en `05-flows/` |
| Endpoint | `EP-<ENTIDAD>-<ACCION>` (semántico, no deriva mecánicamente del path) | `EP-ASSET-UPSERT` | `id:` del YAML en `06-technical/.../endpoints/` |
| Function (DB) | `FN-<NOMBRE_REAL_EN_MAYUSCULAS_CON_GUIONES>` (deriva directo del nombre real de la función PL/pgSQL) | `sgsi.v2_asset_upsert` → `FN-V2-ASSET-UPSERT` | `id:` del YAML en `06-technical/.../functions/` |
| Table | `TABLE:<esquema.tabla>` | `TABLE:sgsi.asset` | **no se declara a mano** — el parser la genera automáticamente a partir de `tables:` en cada function |
| Dependencia externa | `EXT:<domain>` | `EXT:doc-flow` | **no se declara a mano** — el parser la genera automáticamente a partir de `externalDependencies:` |

Reglas:
- El prefijo `V2` en las funciones de Activos refleja el nombre real de la función en `funciones_sgsi.sql` (`v2_asset_*`) — **no es un prefijo obligatorio del estándar**. Cada módulo usa el ID que resulte de mayusculizar y separar con guiones el nombre real de su función; si el módulo no tiene funciones `v2_*`, el ID no lleva `V2`.
- La numeración de Operaciones **no tiene que ser consecutiva**. Un número puede quedar deliberadamente sin usar cuando una acción trivial se fusiona como nota dentro de otra Operación, o cuando una acción resulta ser una invocación de una Operación ya existente desde otra superficie de UI (ver ejemplos reales de `FLOW-ACT-008/014/016` en `activos.md`). Esto se documenta explícitamente en el catálogo del módulo, nunca se reutiliza un ID para otra cosa.
- Ningún ID se reutiliza ni se recicla entre módulos. `DOM-<SIGLA>` es único por módulo.
- Los IDs internos (`type: flow`, `FLOW-*`, `EP-*`, `FN-*`) **nunca cambian por razones de presentación** (ver §5 sobre la diferencia interno/UI).

---

## 5. Qué es una Operación

Una **Operación** (`type: flow` internamente, un archivo `.md` en `05-flows/<modulo>/`) es una acción funcional completa que un usuario o el sistema puede ejecutar dentro del módulo: consultar, crear, editar, dar de baja, reactivar, importar, exportar, ver historial, etc.

**Diferencia crítica — interno vs. UI:**

| | Interno (modelo documental) | UI (Traceability Explorer) |
|---|---|---|
| Tipo de nodo | `type: flow` | — |
| ID | `FLOW-ACT-003` | mostrado como metadata secundaria: `Operación · FLOW-ACT-003` |
| Etiqueta visible | — | `Operación` / `Operaciones` |

Esto es intencional: en este SGSI existe un concepto real de **flujo documental / workflow de aprobación** (`doc-flow`). Llamar "Flow" a una Operación funcional en la interfaz generaba ambigüedad con ese concepto real. La solución fue exclusivamente de presentación — el modelo de datos, el parser y las relaciones siguen usando `flow`/`FLOW-*` sin cambios.

Una Operación **nunca depende documentalmente de otra Operación** — su Markdown debe leerse solo, sin necesitar abrir otra Operación para entenderse (aunque puede mencionar en prosa, como nota, que converge técnicamente con otra).

Front matter mínimo de una Operación (campos reales usados en Activos):

```yaml
id: FLOW-ACT-003
type: flow
domain: DOM-ACT
name: Crear activo
entryPoint: "Botón 'Agregar activo' en /asset-inventory → /asset-inventory/new"
frontend:
  route: /asset-inventory/new
  pages: [...]
  components: [...]
  stores: [...]
  services: [...]
technical:
  endpoint: EP-ASSET-UPSERT        # una sola llamada backend
status: CONFIRMED
externalDependencies:
  - domain: doc-flow
    reason: "..."
```

Cuando la Operación llama a **más de un endpoint**, `technical.endpoint` (singular) se reemplaza por `technical.endpoints` (lista), cada item con una acción legible y la referencia:

```yaml
technical:
  endpoints:
    - { action: "crear / editar", ref: EP-ASSET-UPSERT-GROUP }
    - { action: "activar", ref: EP-ASSET-ACTIVATE-GROUP-BY-ID }
    - { action: "desactivar", ref: EP-ASSET-DEACTIVATE-GROUP-BY-ID }
```

Cuando la Operación es **100% client-side** (no llama backend, ej. exportar a Excel desde datos ya en pantalla), se declara así en vez de inventar un endpoint:

```yaml
technical: null
clientSideOnly: true
externalDependencies: []
```

Secciones narrativas obligatorias dentro del cuerpo Markdown: `## Propósito`, `## Entrada desde UI`, `## Flujo funcional`, `## Frontend`, `## API`, `## Backend`, `## Database` (o la nota de "No aplica" si es client-side), `## Reglas relevantes`, `## Consideraciones`, `## Trazabilidad` (diagrama Mermaid).

---

## 6. Qué es un Endpoint técnico

Un archivo `.yaml` en `06-technical/<modulo>/endpoints/`, uno por endpoint real del backend. Es metadata plana — no tiene narrativa. Campos reales usados:

```yaml
id: EP-ASSET-UPSERT
type: endpoint
method: POST
path: /asset/upsert
access: admin-only
router: api-sgsi/src/routers/asset.ts:37
controller: api-sgsi/src/controllers/asset.ts#upsert
model: api-sgsi/src/models/asset.ts#upsert
function: FN-V2-ASSET-UPSERT
status: CONFIRMED
```

`router` / `controller` / `model` son texto plano con ubicación real en el código (`archivo:línea` o `archivo#función`) — no generan nodos propios en el grafo mientras la relación sea 1:1 con el endpoint. `function:` es el único campo que genera una arista (`executes`) hacia una Function.

---

## 7. Qué es una Function técnica

Un archivo `.yaml` en `06-technical/<modulo>/functions/`, uno por función PL/pgSQL real. Campos reales usados:

```yaml
id: FN-V2-ASSET-UPSERT
type: db-function
name: sgsi.v2_asset_upsert
definedIn: funciones_sgsi.sql:12272-12617
status: CONFIRMED
calls:
  - FN-V2-ASSET-GET-BY-ID
tables:
  - { table: sgsi.asset, access: WRITE }
  - { table: sgsi.asset_history, access: WRITE }
  - { table: corvus.customer_person, access: READ }
notes: >
  Texto libre para matices que no caben en la estructura (ej. una tabla que se
  toca solo como efecto secundario y pertenece funcionalmente a otro dominio).
```

- `calls:` es la única forma de declarar que una función invoca a otra — genera la arista `calls` (base de la convergencia, ver §12).
- `tables:` con `access: WRITE` o `access: READ` es la única forma de declarar acceso a tablas — genera las aristas `writes` / `reads` y **crea el nodo Table automáticamente** si no existía.
- `definedIn` debe apuntar al archivo real (`funciones_sgsi.sql`, raíz del repo — **no** `_database/functions/`, que no contiene las funciones activas de negocio) con rango de líneas verificado leyendo el cuerpo completo de la función, no solo su firma.
- `notes` es el lugar correcto para dejar constancia de hallazgos de código (cascadas, faltas de validación, etc.) sin corregirlos — nunca se "arregla" el hallazgo modificando código durante la documentación.

---

## 8. Cómo se representan las Tables

Las tablas **no tienen archivo propio**. Son nodos derivados exclusivamente de `tables:` dentro de los YAML de function (§7). El parser:
1. Lee cada function.
2. Por cada entrada `{ table, access }`, crea (si no existe) un nodo `TABLE:<esquema.tabla>`.
3. Agrega la arista `writes` (si `access: WRITE`) o `reads` (si `access: READ`) desde la function hacia esa tabla.

Consecuencia: agregar una tabla nueva a la trazabilidad de un módulo nunca requiere crear un archivo — alcanza con declararla en el `tables:` de la function que la toca.

---

## 9. Cómo se registran dependencias externas

Una dependencia externa es una relación **confirmada** con un módulo que **no se documenta en este pase** (ej. Activos depende de `doc-flow`, `risk-treatment`, `ai`, pero ninguno de esos módulos se expande). Se declara **inline**, en el front matter de la Operación que la origina, nunca como archivo:

```yaml
externalDependencies:
  - domain: doc-flow
    reason: "upsert bloqueado (409) si isAssetFlowLockedByCustomer detecta un flujo de aprobación activo."
```

El parser crea el nodo `EXT:<domain>` automáticamente (una sola vez por dominio, aunque varias Operaciones lo referencien) y le agrega, por cada Operación que lo declara, una entrada en `reasons[]` con el motivo puntual. Reglas:
- Un nodo externo **nunca tiene aristas salientes** — no se expande su implementación.
- Si dos Operaciones dependen del mismo dominio externo por razones distintas, ambas razones quedan registradas contra el mismo nodo — no se duplica el nodo.
- El nombre de `domain` debe ser estable entre módulos (ej. siempre `doc-flow`, nunca alternar con `document-flow` o `flujo-documental`) para que dependencias del mismo dominio declaradas desde módulos distintos converjan en el mismo nodo.

---

## 10. Cómo funciona la trazabilidad top-down

`Operación → uses → Endpoint → executes → Function → {calls → Function}* → {writes|reads} → Table`

Se resuelve completamente por join de IDs sobre las aristas generadas por el parser — nunca se recorre ni se interpreta prosa. Es lo que pinta el **Trace Mode** del Explorer para una Operación seleccionada: parte del nodo `flow`, sigue sus `uses` a uno o más endpoints, cada endpoint a su function vía `executes`, y de ahí en cadena (`calls`) hasta las tablas finales (`writes`/`reads`).

---

## 11. Cómo funciona la trazabilidad bottom-up

`Table ← {writes|reads} ← Function ← {calls}* ← Function ← executes ← Endpoint ← uses ← Operación`

Dado un nodo Table o Function, se calculan hacia atrás (por join inverso de las mismas aristas, nunca por archivos "inversos" escritos a mano):
- qué funciones la tocan directamente,
- qué funciones las llaman a esas (indirecto),
- qué endpoints ejecutan esas funciones,
- qué Operaciones usan esos endpoints.

Es la base del **Impact Mode** del Explorer (impacto directo vs. indirecto de tocar una función o una tabla) y del panel "Usado por Operaciones" / "Operaciones afectadas" en la ficha de cada nodo técnico.

---

## 12. Cómo funciona la convergencia

Convergencia = dos o más Operaciones distintas terminan usando el mismo Endpoint y/o la misma Function. Se representa **exclusivamente por IDs compartidos**, nunca repitiendo la relación técnica en prosa estructurada:

- **Convergencia directa**: dos Operaciones apuntan al mismo `technical.endpoint` (ej. Crear y Editar activo comparten `EP-ASSET-UPSERT`).
- **Convergencia vía cadena de funciones**: una Operación usa una function que a su vez `calls` la function que usa otra Operación (ej. Importar activos usa `FN-V2-ASSET-UPSERT-MASSIVE`, que llama a `FN-V2-ASSET-UPSERT` — la misma que usan Crear/Editar).

El Explorer detecta y lista estos puntos automáticamente (`detectConvergences()`): cualquier endpoint usado por más de una Operación, y cualquier function con al menos un caller declarado. No requiere que el documentador declare la convergencia a mano más de una vez — declarar el mismo ID técnico desde cada Operación (o el `calls:` en la function) es suficiente.

---

## 13. Cómo se evita la duplicación

Regla general: **una relación técnica se escribe en un solo lugar, se referencia desde todos los que la necesitan.**

- La relación `endpoint → controller/model/function` vive **solo** en el YAML del endpoint.
- La relación `function → calls/tables` vive **solo** en el YAML de la function.
- Una Operación que converge con otra **no copia** la cadena técnica completa — solo referencia el mismo `technical.endpoint` / `technical.endpoints[].ref`. La convergencia se explica en prosa, en `## Consideraciones`, como una nota humana ("este mismo endpoint también es usado por FLOW-ACT-004"), no como una repetición estructurada de metadata.
- Las relaciones inversas (`Usado por Operaciones`, `Operaciones afectadas`, `Called by`, `Written by` / `Read by`) **nunca se escriben a mano en ningún archivo** — se calculan en tiempo de ejecución en el Explorer por join sobre las aristas ya declaradas.

---

## 14. Qué información vive en Markdown

Todo lo narrativo y orientado a lectura humana, en `05-flows/<modulo>/*.md`:
- Propósito, entrada desde UI, flujo funcional paso a paso.
- Reglas de negocio relevantes y consideraciones (incluyendo notas de convergencia en prosa).
- El diagrama Mermaid de trazabilidad (visualización, no fuente).
- El front matter YAML de cada Operación (identidad, referencias técnicas, dependencias externas) — front matter cuenta como "vive en el archivo de la Operación", aunque su formato sea YAML.

---

## 15. Qué información vive en YAML

Todo lo estructurado y orientado a ser parseado, en `06-technical/<modulo>/{endpoints,functions}/*.yaml`:
- Identidad técnica de cada endpoint (method, path, access, router, controller, model, function que ejecuta).
- Identidad técnica de cada function (nombre real, ubicación exacta, a qué funciones llama, qué tablas toca y con qué acceso).
- `status` (§19) y `notes` de matices/hallazgos.

---

## 16. Qué información NO debe duplicarse

- **No** se repite la cadena `endpoint → function → tables` dentro de cada Operación que la usa — se referencia por ID.
- **No** se mantienen listas de "quién me usa" en ningún archivo (ni en Operaciones, ni en endpoints, ni en functions) — siempre calculado.
- **No** se crean archivos por tabla, ni por router/controller/model individuales.
- **No** se documenta el mismo dominio externo con nombres distintos entre Operaciones o entre módulos.
- **No** se sube un hallazgo o una relación de `PARTIAL`/`AMBIGUOUS` a `CONFIRMED` sin releer el código fuente completo (no alcanza con un grep puntual).

---

## 17. Qué rol tiene Archify

Archify es una herramienta externa del usuario, de apoyo para **discovery y navegación** de código durante la fase de investigación. **No es fuente del grafo** documental en ningún caso — toda relación que termina en `docs/**` debe estar verificada leyendo el código real (o, si Archify se usa como atajo de navegación, confirmada después contra el archivo fuente). El grafo del Explorer nunca se genera a partir de una exportación de Archify.

---

## 18. Qué rol tiene el Explorer

El Traceability Explorer (`docs/explorer/`) es una **capa de lectura**, no de autoría:
1. `parser.mjs` lee `docs/00-catalog/<modulo>.md` + `docs/05-flows/<modulo>/*.md` + `docs/06-technical/<modulo>/**/*.yaml` y produce un grafo normalizado (`nodes[]` / `edges[]`) en `graph.json` / `data.js`.
2. `app.js` + `index.html` + `styles.css` renderizan ese grafo (`window.__EXPLORER_DATA__`) — sin IDs de ningún módulo hardcodeados, sin conocer de antemano qué módulos existen.
3. `validate.mjs` corre las validaciones mínimas obligatorias (§20) contra el grafo generado.
4. `smoke-test.mjs` abre la UI real (headless, `jsdom`) y confirma que las interacciones principales no rompen.

Agregar un módulo nuevo (Markdown + YAML correctos en las carpetas de §3) y correr `npm run build` alcanza para que el Explorer lo incorpore — **nunca se toca `app.js` por un módulo nuevo**, salvo que el módulo introduzca un tipo de nodo o relación genuinamente nuevo que el modelo actual no contemple (caso excepcional, no el flujo normal).

El Explorer **no se integra en `app-sgsi`** — es un prototipo aislado, sin build tool, abrible con doble clic o servido localmente (`npm run serve`).

---

## 19. Qué significa CONFIRMED / PARTIAL / AMBIGUOUS / NOT FOUND

Estado (`status:`) de cada relación u Operación documentada:

| Status | Significa | Regla |
|---|---|---|
| `CONFIRMED` | Verificado leyendo el código real de punta a punta (frontend → API → backend → función → tablas), incluyendo el cuerpo completo de la función, no solo su firma. | Es el único status que el Explorer y este estándar tratan como hecho. |
| `PARTIAL` | Se confirmó una parte de la cadena, pero otra parte no se pudo verificar con la misma certeza (ej. se confirmó el endpoint pero no todos los call-sites del frontend). | Se documenta igual, dejando explícito qué parte falta verificar. Nunca se completa "a criterio" — solo releyendo código. |
| `AMBIGUOUS` | Hay evidencia contradictoria o más de un camino posible en el código y no se pudo determinar cuál aplica sin más contexto. | Se documenta la ambigüedad como tal en prosa (`notes` o `## Consideraciones`); no se elige arbitrariamente una interpretación. |
| `NOT FOUND` | Se buscó la relación esperada (ej. un consumidor de un endpoint) y no se encontró evidencia de que exista. | Se registra como hallazgo (ej. "endpoint sin consumidor confirmado en el frontend inspeccionado"), no se omite ni se asume que existe. |

Ningún nodo o arista con status distinto de `CONFIRMED` se cuenta en las validaciones de convergencia o cifras finales del módulo sin dejarlo explícito.

---

## 20. Validaciones mínimas obligatorias antes de aprobar un módulo

Las mismas 17 validaciones estructurales corridas sobre Activos (`docs/explorer/validate.mjs`), generalizadas:

1. La cantidad de Operaciones detectadas coincide con las documentadas.
2. La cantidad de Endpoints detectados coincide con los documentados.
3. La cantidad de Functions detectadas coincide con las documentadas.
4. La cantidad de Tables derivadas es la esperada (todas alcanzables desde alguna function).
5. **0 referencias rotas** (todo `source`/`target` de toda arista resuelve a un nodo existente).
6. Al menos un caso real de trazabilidad top-down completo (Operación → ... → tabla de negocio principal del módulo) verificado.
7. Al menos un caso real de convergencia directa (mismo endpoint, dos Operaciones) verificado.
8. Al menos un caso real de convergencia vía `calls` (una function llama a otra usada por otra Operación) verificado, si el módulo tiene ese patrón.
9. Toda Operación `clientSideOnly: true` no genera arista `uses` hacia ningún endpoint inventado.
10. Al menos una tabla de negocio permite navegación bottom-up completa (Functions/Endpoints/Operaciones > 0).
11. Impacto **directo** de al menos una function compartida muestra endpoints + Operaciones correctos.
12. Impacto **indirecto** (vía `calls`) de esa misma function muestra las Operaciones correctas.
13. Las dependencias externas aparecen registradas sin expandirse (0 aristas salientes desde nodos `external`).
14. El buscador del Explorer encuentra un set de términos de ejemplo representativos del módulo (nombre de Operación, path de endpoint, nombre de función, tabla, componente).
15. El grafo se construye sin interpretar prosa Markdown (estructural — ningún nodo/arista deriva de una sección narrativa).
16. **0 IDs del módulo hardcodeados** en `app.js` (grep estructural).
17. Agregar un archivo válido nuevo en `05-flows`/`06-technical` y correr `npm run build` incorpora el dato sin tocar la UI.

Adicional (no numérico, pero obligatorio): **smoke test PASS** — la UI real (headless) renderiza Home, ficha de Operación, Trace Mode, Impact Mode, un caso client-side, una ficha de tabla y la búsqueda, sin errores.

---

## 21. Checklist de implementación para un módulo nuevo

```
[ ] Discovery físico
[ ] Vistas frontend confirmadas
[ ] Operaciones confirmadas
[ ] Endpoints confirmados
[ ] Functions confirmadas
[ ] Tables derivadas
[ ] Dependencias externas registradas
[ ] Markdown generado
[ ] YAML generado
[ ] IDs únicos
[ ] 0 referencias rotas
[ ] Top-down validado
[ ] Bottom-up validado
[ ] Convergencias validadas
[ ] Client-side operations correctamente representadas
[ ] PARTIAL/AMBIGUOUS no convertidos en CONFIRMED
[ ] Explorer carga el módulo sin hardcode
[ ] Search funciona
[ ] Impact funciona
[ ] Smoke test PASS
```

Orden recomendado (el mismo seguido en Activos, en checkpoints aprobados uno por uno antes de avanzar):
1. **Discovery** — inspección física de código (frontend, backend, funciones SQL reales en `funciones_sgsi.sql`/`tablas_sgsi.sql`, no en `_database/functions/`), sin modificar nada.
2. **Diseño** — confirmar qué Operaciones existen, dónde convergen, cuáles son client-side.
3. **Implementación documental** — `00-catalog/<modulo>.md`, `05-flows/<modulo>/*.md`, `06-technical/<modulo>/{endpoints,functions}/*.yaml`.
4. **Auditoría de consistencia** — releer puntualmente el código detrás de cada relación no trivial antes de marcarla `CONFIRMED`.
5. **Build + validate + smoke-test** del Explorer contra el módulo nuevo.

---

## 22. Criterios para considerar un módulo "TRACEABILITY COMPLETE"

Un módulo se considera **TRACEABILITY COMPLETE** cuando, simultáneamente:

1. Todas las casillas del checklist (§21) están marcadas.
2. Las validaciones obligatorias (§20) corren **17/17 PASS** contra su grafo.
3. El **smoke test** de la UI pasa incluyendo al menos un caso de cada patrón presente en el módulo (Operación simple, Operación multi-endpoint si existe, Operación client-side si existe, convergencia si existe).
4. No quedan relaciones `AMBIGUOUS` sin registrar explícitamente como tales (pueden quedar `AMBIGUOUS`/`PARTIAL` documentadas — lo que no puede quedar es una relación real sin ningún status).
5. Los hallazgos de código descubiertos durante la documentación (inconsistencias, faltas de validación, cascadas no evidentes, etc.) están registrados en el catálogo del módulo o en `notes:` de la relación correspondiente — corregirlos o no es una decisión aparte del equipo, fuera del alcance de la documentación.
6. Ningún archivo fuera de `docs/00-catalog/<modulo>.md`, `docs/05-flows/<modulo>/`, `docs/06-technical/<modulo>/` y (si aplica) `docs/explorer/` fue modificado para producir la documentación.

---

## Módulo de referencia

**Activos es el módulo de referencia de este estándar.** Todo el vocabulario, la estructura y las reglas de este documento están extraídas directamente de su implementación real (`docs/00-catalog/activos.md`, `docs/05-flows/assets/`, `docs/06-technical/assets/`, `docs/explorer/`) — no de un diseño teórico previo. Ante cualquier ambigüedad futura sobre cómo aplicar este estándar a un módulo nuevo, Activos es el ejemplo a consultar primero.
