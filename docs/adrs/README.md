# Sistema de Decisiones de Arquitectura y Negocio (ADRs)

Este directorio almacena el registro histórico de **decisiones de arquitectura, cambios técnicos y reglas de negocio** adoptadas en el proyecto Barnard SGSI.

El objetivo principal es **hablar el mismo idioma**: que cualquier desarrollador o asistente de IA entienda el *por qué* de las implementaciones, conozca las restricciones antes de modificar código y evite volver a tropezar con problemas ya resueltos.

---

## 📂 Organización por Menú Principal

Para facilitar la navegación mental y la búsqueda de contexto, las carpetas reflejan directamente las secciones principales del menú del sistema (`app-sgsi/src/label/menu.ts`):

| Carpeta | Sección del Menú / Alcance | Ejemplos de Temas |
| :--- | :--- | :--- |
| `00-transversal/` | Decisiones Globales / Core | Autenticación, multi-tenancy (`customerId`), convenciones API/DB, logging |
| `01-contexto-alcance/` | Contexto y Alcance | FODA, PESTEL, Alcance SGSI, Objetivos, KPIs, Metas y Umbrales |
| `02-gobierno/` | Gobierno del SGSI | Áreas, Roles y responsabilidades, Personas, Organigrama |
| `03-inventario-activos/` | Inventario de activo / Grupos | Activos de información, agrupación, valoración de activos |
| `04-gestion-riesgos/` | Gestión de Riesgos | Amenazas/Vulnerabilidades, Matriz de riesgos (4x4), Riesgos organizacionales |
| `05-tratamiento-riesgos/` | Tratamiento de Riesgos | Planes de tratamiento, asignación y seguimiento de acciones |
| `06-controles-soa/` | Controles y SoA | Declaración de Aplicabilidad (SoA), Relación Controles ↔ Riesgos |
| `07-flujo-documental/` | Flujo Documental | Creación, edición enriquecida (TipTap), locks de edición, firmas, versiones |
| `08-eventos-incidentes/` | Eventos e Incidentes | Registro de eventos, investigación, análisis causa raíz (RCA), plan de acción |
| `09-catalogos/` | Catálogos Maestros | Catálogos de controles, vulnerabilidades, políticas, fuentes de riesgo |

---

## 🔍 Regla de Oro: Consultar antes de Desarrollar

Siempre que vayas a:
1. **Crear una nueva funcionalidad**
2. **Modificar un query SQL o esquema de base de datos**
3. **Cambiar la lógica de un endpoint o controlador**
4. **Modificar un flujo o formulario en el frontend**

👉 **Primero revisa la carpeta correspondiente al módulo que vas a tocar.**
Si ya existe un ADR aceptado para ese caso, respeta la decisión o fundamenta un nuevo ADR que la actualice si el requerimiento cambió.

---

## 📝 Cómo Registrar un Nuevo ADR

1. Copia la plantilla base desde:
   [`templates/template-decision.md`](templates/template-decision.md)
2. Ubícalo en la subcarpeta del menú que corresponda (ej. `07-flujo-documental/`).
3. Asigna un nombre claro con numeración correlativa:
   `ADR-[NUM]-[slug-descriptivo].md` (ej. `ADR-006-bloqueo-edicion-concurrente.md`).
4. Completa los campos:
   - **Estado:** `PROPUESTO`, `ACEPTADO`, `OBSOLETO` o `SUPERADO`.
   - **Contexto:** ¿Qué problema o necesidad motivó la decisión?
   - **Decisión:** ¿Qué se acordó hacer (y qué NO hacer)?
   - **Razón:** Justificación técnica y de negocio.
   - **Consecuencias:** Beneficios vs limitaciones/costos aceptados.
   - **Referencias Técnicas:** Rutas de archivos, endpoints o funciones SQL.
5. Registra el nuevo ADR en el índice que se encuentra a continuación.

---

## 📋 Índice de Decisiones Registradas

| ADR | Módulo / Menú | Título | Estado | Fecha |
| :--- | :--- | :--- | :---: | :---: |
| [ADR-005](07-flujo-documental/ADR-005-no-almacenar-imagenes-base64-en-content-json.md) | Flujo documental | No almacenar imágenes Base64 en content_json | ACEPTADO | 2026-08-27 |
