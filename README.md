# Documentación SGSI

Repositorio de apoyo para la documentación, trazabilidad y validación de estándares del SGSI. Este proyecto está pensado como una estructura centralizada para organizar la información técnica, funcional y documental del sistema, facilitando su consulta, mantenimiento y revisión de cumplimiento.

No es un proyecto ejecutable en sí mismo, sino un repositorio de trabajo y referencia para documentar el SGSI, mantener una visión ordenada del sistema y validar que se sigan las reglas definidas por el equipo o por la metodología adoptada.

---

## 1. Objetivo general

Este repositorio busca:

- centralizar la documentación del SGSI;
- mantener una estructura clara por dominios y módulos;
- facilitar la trazabilidad entre flujo, catálogo, implementación y validación;
- ofrecer una vista más amigable y organizada de la información;
- automatizar revisiones de estándares mediante scripts de validación;
- apoyar la entrega de documentación técnica y administrativa para uso interno o académico.

En resumen, sirve como “hub de conocimiento” del SGSI: desde la definición del contexto y alcance, hasta los procesos documentales, controles, riesgos y validaciones de calidad.

---

## 2. ¿Para qué sirve este repositorio?

El repositorio combina varios niveles de información:

1. Documentación funcional y operativa
2. Vista estructurada de dominios y procesos
3. Validaciones automáticas de estándares
4. Soporte documental para usuarios y administradores
5. Herramientas auxiliares para transformar artefactos generados por bases de datos

Esto permite que el trabajo no dependa de archivos dispersos o información fragmentada, sino que se mantenga en una estructura lógica y reutilizable.

---

## 3. Estructura del proyecto

```text
Documentacion-SGSI/
├── .claude/
│   ├── agents/
│   └── skills/
├── docs/
│   ├── 00-catalog/
│   ├── 05-flows/
│   ├── 06-technical/
│   ├── adrs/
│   ├── explorer/
│   ├── AI_WORKFLOW.md
│   ├── INDEX.md
│   └── TRACEABILITY_STANDARD.md
├── Manual_Administrador_Word/
├── Manual_Usuarios_No_Admin_Word/
├── script-split-tablas-funciones/
├── scripts/
├── README.md
└── .git/
```

---

## 4. Descripción de cada carpeta

### 4.1 .claude

Esta carpeta contiene los recursos necesarios para guiar y apoyar la ejecución del proyecto desde un punto de vista de calidad, validación y documentación.

Incluye:

- agents: asistentes especializados para tareas concretas.
- skills: reglas y procedimientos reutilizables para validar estándares, documentar cambios, revisar trazabilidad y apoyar decisiones técnicas.

Su propósito es ayudar a:

- validar el estándar del proyecto;
- detectar inconsistencias o desviaciones;
- guiar la documentación de dominios y flujos;
- apoyar la revisión de calidad de la información generada;
- mantener consistencia en la forma en que se trabaja con el SGSI.

Es decir, esta carpeta actúa como capa de apoyo metodológico y de control de calidad.

---

### 4.2 docs

Esta es la parte más importante de la navegación y presentación del proyecto. Es una vista organizada de la información para poder consultar de forma más clara, detallada y amigable el contenido del SGSI.

Dentro de esta carpeta se encuentran distintos niveles de documentación:

- 00-catalog/: catálogos por dominio, con la definición y alcance del área.
- 05-flows/: flujos funcionales y procesos del SGSI.
- 06-technical/: documentación técnica, endpoints, funciones y detalles de implementación.
- adrs/: decisiones de arquitectura registradas de forma documentada.
- explorer/: visualización gráfica e interactiva del sistema y sus relaciones.

También incluye documentos transversales como:

- AI_WORKFLOW.md: guía de trabajo con IA para apoyar la documentación y trazabilidad.
- TRACEABILITY_STANDARD.md: estándar de trazabilidad.
- INDEX.md: índice general para navegar por dominios, módulos y estructura documentada.

Este conjunto funciona como una “vista documental” del proyecto: ordenada, navegable y pensada para lectura humana, no solo para almacenamiento técnico.

> En otras palabras, docs es la capa de presentación y comprensión del sistema.

#### 4.2.1 ADRs: núcleo de decisión del proyecto

Los ADRs no son un complemento opcional ni una carpeta secundaria. Son una parte crítica del repositorio porque registran la lógica detrás de cada decisión técnica, funcional y de gobierno.

Su valor es fundamental porque responden a preguntas clave como:

- ¿Por qué se diseñó así este flujo?
- ¿Qué restricciones motivaron esta decisión?
- ¿Qué problema se intentó evitar?
- ¿Qué se decidió no hacer?
- ¿Qué impacto tiene cambiar este punto en el futuro?

En la práctica, los ADRs permiten:

- preservar el contexto histórico del proyecto;
- evitar decisiones improvisadas o contradictorias;
- facilitar la comprensión para nuevas personas o asistencias de IA;
- mantener trazabilidad entre análisis, diseño, implementación y evolución del sistema;
- reducir el riesgo de repetir errores ya solucionados.

Por eso, aunque estén dentro de la carpeta docs, su relevancia es central: son el “registro de razón” del SGSI.

La carpeta [docs/adrs](docs/adrs) debe entenderse como la memoria institucional del proyecto, donde cada decisión queda documentada y justificada.

---

### 4.3 Manual_Administrador_Word

Carpeta que contiene el manual administrativo en formato Word, solicitado por Corvus.

Su finalidad es la entrega de documentación orientada a administración del SGSI, con un enfoque más formal y operativo.

Aunque es útil, no es el centro principal del repositorio de trabajo. Es una pieza complementaria de apoyo documental, más orientada a usuarios administrativos o responsables del sistema.

---

### 4.4 Manual_Usuarios_No_Admin_Word

Carpeta que contiene el manual para usuarios no administradores, también en formato Word.

Su función es orientar al usuario final en el uso del sistema, mostrando procesos, navegación y tareas operativas sin entrar tanto en la parte técnica o de gobierno.

Al igual que el manual administrativo, tiene un valor documental importante, pero su prioridad es la experiencia del usuario y el uso operativo diario.

---

### 4.5 script-split-tablas-funciones

Esta carpeta responde a un problema real de trabajo: cuando se obtiene el DDL desde la base de datos, normalmente no viene separado por archivos ni organizado por tabla o función.

Por esa razón esta utilidad:

- separa tablas y funciones en archivos distintos;
- ayuda a ordenar el contenido generado por la BD;
- reduce el trabajo manual de división de scripts;
- facilita la gestión del código SQL y su mantenimiento posterior.

Los archivos principales son:

- split_tables.py
- split_functions.py

Su utilidad es muy concreta y práctica: automatizar una tarea repetitiva y tediosa que de otra forma tendría que realizarse manualmente.

---

### 4.6 scripts

Esta carpeta contiene validaciones automatizadas para comprobar si se están respetando los estándares del proyecto.

Los scripts están diseñados para revisar aspectos como:

- arquitectura;
- seguridad;
- uso de JWT y cookies;
- orden de middlewares;
- tamaños de componentes;
- convenciones de nombres;
- soft deletes;
- uso seguro de parámetros en queries SQL;
- transiciones de estado;
- validación con los motores correctos (Zod/Joi);
- detección de lógica de negocio en PL/pgSQL.

Son herramientas de control y calidad. Su función es detectar qué está bien y qué no, para prevenir desviaciones antes de que se conviertan en problemas.

Importante:

- estos scripts funcionan cuando la estructura del proyecto y los estándares esperados están presentes;
- si no existe algún archivo, regla o patrón requerido, el script puede devolver error o advertencia;
- no son una “validación opcional” en sentido relajado, sino una comprobación de cumplimiento de buenas prácticas.

Es decir, la lógica aquí es: si el estándar está en el proyecto, la validación debe pasar; si no, se debe corregir la causa raíz.

---

## 5. Cómo interpretar el repositorio

El proyecto puede entenderse como una combinación de cuatro capas:

### Capa 1: documentación del SGSI
Contiene el contexto, alcance, activos, riesgos, controles, flujo documental, eventos e incidentes, etc.

### Capa 2: visualización y navegación
Se presenta en la carpeta docs para facilitar la lectura y comprensión del contenido.

### Capa 3: validación técnica
Se apoya en scripts que revisan si se cumple el estándar y si la implementación es consistente.

### Capa 4: soporte administrativo y de usuario
Se refleja en los manuales Word, útiles para la operación y la gestión del sistema.

---

## 6. Relación entre carpetas

El repositorio no es una colección aislada de archivos; cada carpeta cumple una función distinta dentro del mismo flujo de trabajo:

- .claude ayuda a guiar y validar
- docs presenta y organiza la información
- scripts comprueba el cumplimiento
- script-split-tablas-funciones automatiza la preparación de SQL
- Manuales complementan la entrega documental formal

Juntas forman un ecosistema de documentación, revisión y validación para el SGSI.

---

## 7. Uso recomendado

Para trabajar con este repositorio, se recomienda seguir este orden:

1. Revisar la estructura general y los índices de docs.
2. Entender el dominio o flujo que se quiere consultar.
3. Validar si la información está correctamente documentada.
4. Usar scripts para revisar cumplimiento de estándares.
5. Conservar la documentación organizada y trazable.
6. Utilizar los manuales como soporte operativo y administrativo.

---

## 8. Resumen ejecutivo

Este repositorio se convierte en una herramienta de apoyo integral para:

- documentar el SGSI de forma ordenada;
- facilitar la lectura y trazabilidad de procesos;
- validar que se cumplan estándares de arquitectura, seguridad y estructura;
- automatizar tareas repetitivas de SQL;
- entregar material administrativo y de usuario;
- mantener un proyecto más profesional, claro y sostenible.

---

## 9. Conclusión

La estructura del proyecto está pensada para combinar documentación, validación y soporte operativo. Cada carpeta tiene un sentido específico y aporta valor en una parte distinta del ciclo de trabajo del SGSI.

El valor real del repositorio no está solo en su contenido, sino en cómo organiza la información para que sea entendible, verificable y útil tanto para la documentación técnica como para la presentación final del trabajo.

---

## 10. Nota final

Este README sirve como una visión general del proyecto y su propósito. Para profundizar en aspectos específicos, se recomienda consultar las carpetas de docs y scripts, así como los archivos de guía dentro de la propia documentación.
