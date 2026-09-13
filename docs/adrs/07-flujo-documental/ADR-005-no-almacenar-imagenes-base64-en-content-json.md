# ADR-005 — No almacenar imágenes Base64 en content_json

Estado: ACEPTADO
Fecha: 2026-08-27
Módulo / Menú: Flujo documental > Edición de documentos
Tipo de impacto: Frontend, Backend, Base de Datos

## Contexto

Los documentos importados desde DOCX o pegados en el editor pueden contener imágenes
Base64 dentro del JSON de TipTap (`content_json` en `sgsi.doc_versions`).

Esto provoca versiones de documentos excesivamente pesadas, saturación de memoria en el navegador,
payloads gigantescos en la API y problemas al renderizar o compilar vistas previas y PDFs.

## Decisión

Las imágenes no se almacenarán como Base64 dentro de `content_json`.
Se almacenarán externamente en el servicio de archivos (`sgsi.file`) y TipTap mantendrá
únicamente una referencia tipo URL/ID (ej. `/file/download/:id`).

## Razón

- Reduce drásticamente el tamaño de los registros en `sgsi.doc_versions`.
- Evita payloads JSON de varios megabytes transferidos por HTTP.
- Mejora la velocidad de carga del editor TipTap y la generación de PDF (`api-pdf`).
- Mantiene `content_json` enfocado estrictamente en la estructura jerárquica y texto del documento.

## Consecuencias

Positivas:
- Documentos mucho más livianos y carga instantánea del editor.
- Mejor rendimiento general y menor consumo de ancho de banda y memoria.
- Reutilización del motor de persistencia de archivos existente.

Negativas:
- Se debe gestionar el ciclo de vida y almacenamiento de las imágenes adjuntas.
- Las referencias URL/ID deben mantenerse válidas e íntegras a lo largo de las versiones del documento.

## Referencias Técnicas

- **Frontend:** `app-sgsi/src/components/functional/doc-flow/edition/DocumentContentSection.tsx`
- **Frontend Converter:** `app-sgsi/src/components/functional/doc-flow/edition/docx-converter-utils.ts`
- **Backend Router / Controller:** `api-sgsi/src/routers/doc-documents.ts`, `api-sgsi/src/controllers/doc-documents.ts` (`handleUploadDocumentImage`)
- **Backend Model:** `api-sgsi/src/models/file.ts` (`upsert`), `api-sgsi/src/models/doc-documents.ts` (`updateContent`)
- **Database:** Tabla `sgsi.file`, tabla `sgsi.doc_versions` (columna `content_json`)
