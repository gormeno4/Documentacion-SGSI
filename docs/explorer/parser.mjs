// parser.mjs
//
// DOCUMENTATION -> PARSER -> NORMALIZED GRAPH
//
// Lee EXCLUSIVAMENTE:
//   docs/05-flows/<modulo>/*.md              (front matter YAML + prosa) — uno por módulo
//   docs/06-technical/<modulo>/endpoints/*.yaml
//   docs/06-technical/<modulo>/functions/*.yaml
//   docs/00-catalog/*.md                     (una ficha por módulo)
//
// No conoce ningún módulo "a priori": los módulos mismos se descubren listando las
// subcarpetas de docs/05-flows/ y docs/06-technical/, y cada Flow/Endpoint/Function/
// Table/External dentro de ellos se descubre leyendo el filesystem. Agregar un módulo
// nuevo (carpeta + .md/.yaml correctos) alcanza para que aparezca aquí, sin tocar este
// archivo ni la UI.
//
// Salida:
//   docs/explorer/graph.json  (grafo normalizado, para inspección / validate.mjs)
//   docs/explorer/data.js     (mismo contenido, expuesto como window.__EXPLORER_DATA__
//                              para que index.html funcione abierto directo con file://,
//                              sin necesitar servidor ni build tool adicional)

import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import yaml from "js-yaml";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const REPO_ROOT = path.resolve(__dirname, "..", "..");
const FLOWS_ROOT = path.join(REPO_ROOT, "docs", "05-flows");
const TECHNICAL_ROOT = path.join(REPO_ROOT, "docs", "06-technical");
const CATALOG_DIR = path.join(REPO_ROOT, "docs", "00-catalog");

function listModuleDirs(root) {
  if (!fs.existsSync(root)) return [];
  return fs
    .readdirSync(root, { withFileTypes: true })
    .filter((d) => d.isDirectory())
    .map((d) => d.name)
    .sort();
}

function readDirFiles(dir, ext) {
  if (!fs.existsSync(dir)) return [];
  return fs
    .readdirSync(dir)
    .filter((f) => f.endsWith(ext))
    .map((f) => path.join(dir, f));
}

// Recorre todas las subcarpetas de módulo bajo `root` (ej. docs/05-flows/*) y
// junta los archivos de `subPath` (ej. "" para flows, "endpoints"/"functions"
// para technical) de cada una. Un módulo sin esa subcarpeta simplemente no aporta nada.
function readAllModules(root, subPath, ext) {
  const files = [];
  for (const mod of listModuleDirs(root)) {
    const dir = subPath ? path.join(root, mod, subPath) : path.join(root, mod);
    files.push(...readDirFiles(dir, ext));
  }
  return files;
}

function splitFrontMatter(raw) {
  const m = raw.match(/^---\n([\s\S]*?)\n---\n([\s\S]*)$/);
  if (!m) return { frontMatter: {}, body: raw };
  const frontMatter = yaml.load(m[1]) || {};
  const body = m[2];
  return { frontMatter, body };
}

// Extrae secciones "## Heading" -> texto, y el bloque ```mermaid``` (se conserva
// tal cual, pero el grafo NUNCA se construye a partir de él - regla 25).
function extractSections(body) {
  const sections = {};
  const headingRe = /^##\s+(.+?)\s*$/gm;
  const matches = [...body.matchAll(headingRe)];
  for (let i = 0; i < matches.length; i++) {
    const title = matches[i][1].trim();
    const start = matches[i].index + matches[i][0].length;
    const end = i + 1 < matches.length ? matches[i + 1].index : body.length;
    sections[title] = body.slice(start, end).trim();
  }
  let mermaid = null;
  const mm = body.match(/```mermaid\n([\s\S]*?)```/);
  if (mm) mermaid = mm[1].trim();
  return { sections, mermaid };
}

const nodes = new Map(); // id -> node
const edges = []; // { source, target, relation, label? }

function addNode(node) {
  if (nodes.has(node.id)) {
    throw new Error(`ID duplicado detectado durante el parseo: ${node.id}`);
  }
  nodes.set(node.id, node);
}

function addEdge(source, target, relation, extra = {}) {
  edges.push({ source, target, relation, ...extra });
}

function getOrCreateTableNode(tableName) {
  const id = `TABLE:${tableName}`;
  if (!nodes.has(id)) {
    addNode({ id, type: "table", name: tableName, metadata: {} });
  }
  return id;
}

function getOrCreateExternalNode(domain) {
  const id = `EXT:${domain}`;
  if (!nodes.has(id)) {
    addNode({ id, type: "external", name: domain, metadata: { reasons: [] } });
  }
  return id;
}

// ---------------------------------------------------------------------------
// 1. FUNCTIONS
// ---------------------------------------------------------------------------
const functionFiles = readAllModules(TECHNICAL_ROOT, "functions", ".yaml");
for (const file of functionFiles) {
  const doc = yaml.load(fs.readFileSync(file, "utf8"));
  addNode({
    id: doc.id,
    type: "function",
    name: doc.name,
    metadata: {
      definedIn: doc.definedIn || null,
      status: doc.status || null,
      notes: doc.notes ? String(doc.notes).trim() : null,
      sourceFile: path.relative(REPO_ROOT, file),
    },
  });
}
// Segunda pasada: aristas (todas las funciones deben existir ya como nodos)
for (const file of functionFiles) {
  const doc = yaml.load(fs.readFileSync(file, "utf8"));
  for (const callee of doc.calls || []) {
    addEdge(doc.id, callee, "calls");
  }
  for (const t of doc.tables || []) {
    const tableId = getOrCreateTableNode(t.table);
    const relation = t.access === "WRITE" ? "writes" : "reads";
    addEdge(doc.id, tableId, relation);
  }
}

// ---------------------------------------------------------------------------
// 2. ENDPOINTS
// ---------------------------------------------------------------------------
const endpointFiles = readAllModules(TECHNICAL_ROOT, "endpoints", ".yaml");
for (const file of endpointFiles) {
  const doc = yaml.load(fs.readFileSync(file, "utf8"));
  addNode({
    id: doc.id,
    type: "endpoint",
    name: `${doc.method} ${doc.path}`,
    metadata: {
      method: doc.method,
      path: doc.path,
      access: doc.access || null,
      router: doc.router || null,
      controller: doc.controller || null,
      model: doc.model || null,
      status: doc.status || null,
      notes: doc.notes ? String(doc.notes).trim() : null,
      sourceFile: path.relative(REPO_ROOT, file),
    },
  });
}
for (const file of endpointFiles) {
  const doc = yaml.load(fs.readFileSync(file, "utf8"));
  if (doc.function) {
    addEdge(doc.id, doc.function, "executes");
  }
}

// ---------------------------------------------------------------------------
// 3. FLOWS
// ---------------------------------------------------------------------------
const flowFiles = readAllModules(FLOWS_ROOT, "", ".md");
const flowExtras = {}; // id -> { sections, mermaid, entryPoint, frontend, clientSideOnly }

for (const file of flowFiles) {
  const raw = fs.readFileSync(file, "utf8");
  const { frontMatter: fm, body } = splitFrontMatter(raw);
  const { sections, mermaid } = extractSections(body);

  const clientSideOnly = fm.clientSideOnly === true || fm.technical === null;

  addNode({
    id: fm.id,
    type: "flow",
    name: fm.name,
    metadata: {
      domain: fm.domain || null,
      menuSection: fm.menuSection || null,
      status: fm.status || null,
      entryPoint: fm.entryPoint || null,
      clientSideOnly,
      frontend: fm.frontend || null,
      sourceFile: path.relative(REPO_ROOT, file),
    },
  });

  flowExtras[fm.id] = { sections, mermaid, frontMatter: fm };

  // flow -uses-> endpoint(s)
  const tech = fm.technical;
  if (tech && typeof tech === "object") {
    if (tech.endpoint) {
      addEdge(fm.id, tech.endpoint, "uses");
    } else if (Array.isArray(tech.endpoints)) {
      for (const item of tech.endpoints) {
        addEdge(fm.id, item.ref, "uses", { label: item.action || null });
      }
    }
  }

  // flow -depends_on-> external
  for (const dep of fm.externalDependencies || []) {
    const extId = getOrCreateExternalNode(dep.domain);
    nodes.get(extId).metadata.reasons.push({ flow: fm.id, reason: dep.reason });
    addEdge(fm.id, extId, "depends_on", { reason: dep.reason });
  }
}

// ---------------------------------------------------------------------------
// 4. Validar que toda arista resuelva a un nodo existente (referencias rotas)
// ---------------------------------------------------------------------------
const brokenRefs = [];
for (const e of edges) {
  if (!nodes.has(e.source)) brokenRefs.push(`source inexistente: ${e.source} (${e.relation} -> ${e.target})`);
  if (!nodes.has(e.target)) brokenRefs.push(`target inexistente: ${e.target} (${e.source} -> ${e.relation})`);
}
if (brokenRefs.length > 0) {
  console.error("Referencias rotas detectadas:\n" + brokenRefs.join("\n"));
  process.exit(1);
}

// ---------------------------------------------------------------------------
// 4b. TRANSVERSAL COMPONENTS (detection from docs/06-technical/*/README.md)
// ---------------------------------------------------------------------------
const transversalComponents = [];
for (const mod of listModuleDirs(TECHNICAL_ROOT)) {
  const readmeFile = path.join(TECHNICAL_ROOT, mod, "README.md");
  if (fs.existsSync(readmeFile)) {
    const raw = fs.readFileSync(readmeFile, "utf8");
    const { frontMatter: fm } = splitFrontMatter(raw);
    if (fm.type === "component") {
      const endpointFilesInMod = readDirFiles(path.join(TECHNICAL_ROOT, mod, "endpoints"), ".yaml");
      const functionFilesInMod = readDirFiles(path.join(TECHNICAL_ROOT, mod, "functions"), ".yaml");
      transversalComponents.push({
        name: fm.name || mod,
        slug: fm.slug || mod,
        classification: fm.classification || "TRANSVERSAL COMPONENT",
        route: fm.route || null,
        status: fm.status || "DOCUMENTED",
        summary: fm.summary || null,
        convergences: fm.convergences || [],
        endpoints: endpointFilesInMod.length,
        functions: functionFilesInMod.length,
        sourceFile: path.relative(REPO_ROOT, readmeFile),
      });
    }
  }
}

// ---------------------------------------------------------------------------
// 5. Catálogo (resumen de cada módulo, texto humano, no cuenta números aquí)
// ---------------------------------------------------------------------------
// app.js espera un único string en graph.catalogSummary (una sola sección
// "Resumen" en Home) — con N módulos se concatenan sus resúmenes, cada uno
// encabezado por el nombre del módulo, en vez de tocar app.js para que
// renderice una lista. Mostrar un resumen por módulo (en vez de uno solo,
// como hoy) requeriría cambiar la UI — ver hallazgo en el reporte de Checkpoint C.
let catalogSummary = null;
const catalogFiles = readDirFiles(CATALOG_DIR, ".md").sort();
const catalogParts = [];
// domain id (fm.id, ej. "DOM-ACT") -> { name, menuLabel }. menuLabel es el nombre
// tal cual aparece en el menú real de app-sgsi (app-sgsi/src/label/menu.ts), si el
// catálogo lo declaró; si no, se usa `name`. Nunca se hardcodea acá.
const domains = {};
const modules = []; // structured per-module summaries for the UI
for (const file of catalogFiles) {
  const raw = fs.readFileSync(file, "utf8");
  const { frontMatter: fm, body } = splitFrontMatter(raw);
  const { sections } = extractSections(body);
  if (fm.id && fm.name) domains[fm.id] = { name: fm.name, menuLabel: fm.menuLabel || fm.name, summary: sections["Resumen"] || null };
  if (sections["Resumen"]) {
    catalogParts.push(`${fm.name || path.basename(file, ".md")}: ${sections["Resumen"]}`);
    modules.push({ id: fm.id || null, name: fm.name || path.basename(file, ".md"), menuLabel: fm.menuLabel || fm.name || path.basename(file, ".md"), summary: sections["Resumen"] });
  }
}
if (catalogParts.length) catalogSummary = catalogParts.join("\n\n");

// ---------------------------------------------------------------------------
// 6. Conteos (derivados, no hardcodeados)
// ---------------------------------------------------------------------------
const counts = { flow: 0, endpoint: 0, function: 0, table: 0, external: 0 };
for (const n of nodes.values()) counts[n.type] = (counts[n.type] || 0) + 1;

const graph = {
  generatedAt: new Date().toISOString(),
  counts,
  nodes: [...nodes.values()],
  edges,
  flows: flowExtras,
  catalogSummary,
  modules,
  domains,
  transversalComponents,
};

fs.writeFileSync(path.join(__dirname, "graph.json"), JSON.stringify(graph, null, 2), "utf8");
fs.writeFileSync(
  path.join(__dirname, "data.js"),
  `// Generado por parser.mjs — NO editar a mano. Re-ejecutar "node parser.mjs" tras cambios en docs/.\nwindow.__EXPLORER_DATA__ = ${JSON.stringify(graph)};\n`,
  "utf8"
);

console.log(`OK. Nodos: ${JSON.stringify(counts)}. Aristas: ${edges.length}. Referencias rotas: 0.`);
console.log(`Escrito: docs/explorer/graph.json y docs/explorer/data.js`);
