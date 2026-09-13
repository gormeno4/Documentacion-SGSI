# Barnard SGSI — Traceability Explorer (prototipo)

Prototipo aislado que lee `docs/05-flows/assets/*.md` y `docs/06-technical/assets/**/*.yaml`,
construye un grafo normalizado (`nodes[]` / `edges[]`) y lo visualiza en una interfaz dark,
navegable, con búsqueda, modo de trazabilidad y análisis de impacto.

**No forma parte de `app-sgsi`.** No requiere backend, no toca PostgreSQL, no modifica
código productivo. `docs/05-flows/assets/*.md` y `docs/06-technical/assets/**/*.yaml` siguen
siendo la única fuente de verdad — este Explorer solo la interpreta.

## Arquitectura

```
docs/05-flows/assets/*.md  ─┐
docs/06-technical/**/*.yaml ┼──►  parser.mjs  ──►  graph.json / data.js  ──►  index.html (UI)
docs/00-catalog/activos.md ─┘
```

- **`parser.mjs`** — único punto que lee el filesystem. No sabe nada de "Activos" de antemano:
  descubre Flows/Endpoints/Functions iterando los directorios. Escribe:
  - `graph.json` — grafo normalizado, para inspección o para un futuro backend.
  - `data.js` — el mismo grafo como `window.__EXPLORER_DATA__`, para que `index.html`
    funcione abierto directo con `file://`, sin servidor.
- **`app.js`** — toda la UI. Solo lee `window.__EXPLORER_DATA__`; no contiene ningún ID de
  Flow/Endpoint/Function escrito a mano (verificado por `validate.mjs`, check 16).
- **`validate.mjs`** — corre las 17 validaciones obligatorias contra `graph.json`.
- **`smoke-test.mjs`** — smoke test headless (jsdom) que abre la UI y ejercita las
  interacciones principales (navegar a un Flow, activar Trace Mode, Impact Mode, búsqueda,
  breadcrumbs) para confirmar que no hay errores de runtime.

## Uso

```bash
cd docs/explorer
npm install            # una vez (instala js-yaml y, para dev, jsdom)
npm run build           # parser.mjs -> graph.json + data.js
npm run validate        # las 17 validaciones obligatorias
npm run smoke-test      # smoke test headless de la UI
```

Luego abre `docs/explorer/index.html` directo en el navegador (doble clic — no necesita
servidor), o `npm run serve` y visita `http://localhost:8743`.

## Agregar un Flow nuevo

1. Crea `docs/05-flows/assets/nuevo-flow.md` siguiendo el modelo aprobado (front matter con
   `id`, `technical.endpoint`, etc.) y, si corresponde, un endpoint/función nuevos en
   `docs/06-technical/assets/`.
2. `npm run build` (dentro de `docs/explorer/`).
3. Recarga `index.html`.

No se toca `parser.mjs`, `app.js` ni ningún archivo de la UI — es la validación central del
prototipo (check 17).

## Limitaciones conocidas

Ver `ASSET TRACEABILITY EXPLORER — CHECKPOINT D` (sección 16) en la conversación de origen.
