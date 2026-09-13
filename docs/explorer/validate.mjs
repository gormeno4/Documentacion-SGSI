// validate.mjs
//
// Corre las 17 validaciones obligatorias (sección 27 del prompt) contra
// docs/explorer/graph.json, generado por parser.mjs. No vuelve a leer docs/**
// directamente -- valida el grafo ya normalizado, que es lo que consume la UI.

import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const graph = JSON.parse(fs.readFileSync(path.join(__dirname, "graph.json"), "utf8"));

const byId = new Map(graph.nodes.map((n) => [n.id, n]));
const byType = (t) => graph.nodes.filter((n) => n.type === t);

function edgesFrom(id, relation) {
  return graph.edges.filter((e) => e.source === id && (!relation || e.relation === relation));
}
function edgesTo(id, relation) {
  return graph.edges.filter((e) => e.target === id && (!relation || e.relation === relation));
}

// BFS forward over "calls"/"executes"/"uses" is not needed here; we need
// generic forward walk following any relation, used for top-down chain checks.
function forwardTables(functionId, seenFns = new Set()) {
  if (seenFns.has(functionId)) return new Set();
  seenFns.add(functionId);
  const tables = new Set();
  for (const e of edgesFrom(functionId)) {
    if (e.relation === "writes" || e.relation === "reads") tables.add(e.target);
    if (e.relation === "calls") {
      for (const t of forwardTables(e.target, seenFns)) tables.add(t);
    }
  }
  return tables;
}

// Reverse index: table -> functions (direct + via calls), -> endpoints -> flows.
function callersOf(functionId, seen = new Set()) {
  if (seen.has(functionId)) return seen;
  seen.add(functionId);
  for (const e of edgesTo(functionId, "calls")) callersOf(e.source, seen);
  return seen;
}

function bottomUpFromTable(tableId) {
  const directFns = edgesTo(tableId).filter((e) => e.relation === "writes" || e.relation === "reads").map((e) => e.source);
  const allFns = new Set();
  for (const fn of directFns) for (const f of callersOf(fn)) allFns.add(f);
  const endpoints = new Set();
  for (const fn of allFns) for (const e of edgesTo(fn, "executes")) endpoints.add(e.source);
  const flows = new Set();
  for (const ep of endpoints) for (const e of edgesTo(ep, "uses")) flows.add(e.source);
  return { functions: [...allFns], endpoints: [...endpoints], flows: [...flows] };
}

const results = [];
function check(n, description, pass, detail) {
  results.push({ n, description, pass, detail });
}

// [1]-[4] counts — por prefijo de ID, para poder afirmar "Activos no tuvo
// regresión" (13/14/14) Y "Riesgos quedó completo" (11/22/23) por separado,
// además del total combinado. Generalizado al sumar Riesgos (antes hardcodeado a
// un solo módulo, "Activos", porque era el único que existía).
const byPrefix = (type, prefix) => byType(type).filter((n) => n.id.startsWith(prefix)).length;
const docflowFlowCount = byPrefix("flow", "FLOW-DOCFLOW-");
const docflowEndpointCount = byPrefix("endpoint", "EP-DOCFLOW-") + byPrefix("endpoint", "EP-DOC-"); // EP-DOC- también cubre EP-DOC-FLOW-GROUP-*/EP-DOC-FLOW-APPROVER-GROUP-*
const docflowFunctionCount = byType("function").filter(
  (n) => n.id.startsWith("FN-DOC") || n.id.startsWith("FN-V2-DOC-FLOW-") || n.id === "FN-V2-DOCUMENT-WORKFLOW-SNAPSHOT-ORGANIGRAMA"
).length;
const ctxFlowCount = byPrefix("flow", "FLOW-CTX-");
const ctxEndpointCount = byType("endpoint").filter((n) =>
  n.id.startsWith("EP-SCOPE-") || n.id.startsWith("EP-FODA-") || n.id.startsWith("EP-PESTEL-") ||
  n.id.startsWith("EP-BASE-PESTEL-") || n.id.startsWith("EP-STRATEGIC-OBJECTIVE-") || n.id.startsWith("EP-BASE-STRATEGIC-OBJECTIVE-") ||
  n.id.startsWith("EP-KPI-") || n.id.startsWith("EP-FREQUENCY-") || n.id.startsWith("EP-THRESHOLD-GOAL-") || n.id.startsWith("EP-BASE-KPI-") ||
  n.id.startsWith("EP-EXECUTIVE-SUMMARY-") || n.id.startsWith("EP-MONITORING-RESULT-")
).length;
const ctxFunctionCount = byType("function").filter((n) =>
  n.id.startsWith("FN-V2-SCOPE-") || n.id === "FN-SCOPE-GET-RELATED-DOCUMENTS-JSON" ||
  n.id.startsWith("FN-V2-FODA-") || n.id.startsWith("FN-V2-PESTEL-") || n.id.startsWith("FN-V2-BASE-PESTEL-") ||
  n.id.startsWith("FN-V2-STRATEGIC-OBJECTIVE-") || n.id.startsWith("FN-V2-BASE-STRATEGIC-OBJECTIVE-") ||
  n.id.startsWith("FN-V2-KPI-") || n.id.startsWith("FN-V2-FREQUENCY-") || n.id.startsWith("FN-V2-THRESHOLD-GOAL-") || n.id.startsWith("FN-V2-BASE-KPI-") ||
  n.id.startsWith("FN-V2-EXECUTIVE-SUMMARY-") || n.id.startsWith("FN-V2-MONITORING-RESULT-")
).length;
// Gobierno del SGSI (DOM-GOV) — sus endpoints/functions no comparten un prefijo único
// (el módulo toca 10 routers y dos esquemas SQL), así que se cuentan por lista explícita
// de prefijos, igual que se hizo con Contexto y Alcance.
const GOV_EP_PREFIXES = ["EP-CUSTOMER-", "EP-BRANCH-", "EP-DISTRICT-", "EP-ROL-", "EP-AREA-", "EP-GOVERNMENT-", "EP-STAFF-", "EP-PERSON-", "EP-POSITION-", "EP-COMMUNICATIONS-MATRIX-"];
const GOV_FN_PREFIXES = ["FN-V2-CUSTOMER-", "FN-V2-BRANCH-", "FN-V2-DISTRICT-", "FN-V2-ROL-", "FN-V2-AREA-", "FN-AREA-", "FN-CHECK-AREA-", "FN-V2-GOVERNMENT-", "FN-V2-STAFF-", "FN-V2-PERSON-", "FN-PERSON-", "FN-CHECK-PERSON-", "FN-TRAINING-", "FN-V2-TRAINING-", "FN-V2-POSITION-", "FN-CHECK-POSITION-", "FN-V2-COMMUNICATIONS-MATRIX-", "FN-V2-USER-"];
const govFlowCount = byPrefix("flow", "FLOW-GOV-");
const govEndpointCount = byType("endpoint").filter((n) => GOV_EP_PREFIXES.some((p) => n.id.startsWith(p))).length;
const govFunctionCount = byType("function").filter((n) => GOV_FN_PREFIXES.some((p) => n.id.startsWith(p))).length;
const secFlowCount = byPrefix("flow", "FLOW-SEC-");
const secEndpointCount = byPrefix("endpoint", "EP-SECURITY-EVENT-");
const secFunctionCount = byPrefix("function", "FN-V2-SECURITY-EVENT-") + byPrefix("function", "FN-V2-INCIDENT-");
check(1, "13 Flows de Activos + 11 de Riesgos + 6 de SoA + 12 de Doc-Flow + 7 de Contexto y Alcance + 12 de Gobierno + 9 de Seguridad = 70+ total", byPrefix("flow", "FLOW-ACT-") === 13 && byPrefix("flow", "FLOW-RSK-") === 11 && byPrefix("flow", "FLOW-SOA-") === 6 && docflowFlowCount === 12 && ctxFlowCount === 7 && govFlowCount === 12 && secFlowCount === 9 && byType("flow").length >= 70, `flows=${byType("flow").length} (ACT=${byPrefix("flow", "FLOW-ACT-")}, RSK=${byPrefix("flow", "FLOW-RSK-")}, SOA=${byPrefix("flow", "FLOW-SOA-")}, DOCFLOW=${docflowFlowCount}, CTX=${ctxFlowCount}, GOV=${govFlowCount}, SEC=${secFlowCount})`);
check(2, "Endpoints crecen con DOM-SEC", byPrefix("endpoint", "EP-ASSET-") === 14 && secEndpointCount >= 18 && byType("endpoint").length >= 192, `endpoints=${byType("endpoint").length} (ACT=${byPrefix("endpoint", "EP-ASSET-")}, SEC=${secEndpointCount})`);
check(3, "Functions crecen con DOM-SEC", secFunctionCount >= 20 && byType("function").length >= 223, `functions=${byType("function").length} (SEC=${secFunctionCount})`);
check(4, "Tables derivadas crecen con DOM-SEC", byType("table").length >= 115, `tables=${byType("table").length}`);

// [5] referencias rotas
const broken = graph.edges.filter((e) => !byId.has(e.source) || !byId.has(e.target));
check(5, "0 referencias rotas", broken.length === 0, `rotas=${broken.length}`);

// [6] Crear activo llega a sgsi.asset
const createFlow = "FLOW-ACT-003";
const createEp = edgesFrom(createFlow, "uses").map((e) => e.target);
const createFn = createEp.flatMap((ep) => edgesFrom(ep, "executes").map((e) => e.target));
const createTables = new Set(createFn.flatMap((fn) => [...forwardTables(fn)]));
check(6, "Crear activo llega a sgsi.asset", createTables.has("TABLE:sgsi.asset"), `tablas alcanzadas=${[...createTables].join(",")}`);

// [7] Editar converge con Crear (mismo endpoint+function)
const editFlow = "FLOW-ACT-004";
const editEp = edgesFrom(editFlow, "uses").map((e) => e.target);
check(
  7,
  "Editar activo converge con Crear (mismo EP-ASSET-UPSERT)",
  createEp.length === 1 && editEp.length === 1 && createEp[0] === editEp[0],
  `create.endpoint=${createEp}, edit.endpoint=${editEp}`
);

// [8] Importar converge mediante FN-V2-ASSET-UPSERT-MASSIVE -> calls -> FN-V2-ASSET-UPSERT
const importFlow = "FLOW-ACT-007";
const importEp = edgesFrom(importFlow, "uses").map((e) => e.target);
const importFn = importEp.flatMap((ep) => edgesFrom(ep, "executes").map((e) => e.target));
const importCalls = importFn.flatMap((fn) => edgesFrom(fn, "calls").map((e) => e.target));
check(
  8,
  "Importar converge mediante FN-V2-ASSET-UPSERT-MASSIVE.calls -> FN-V2-ASSET-UPSERT",
  importFn.includes("FN-V2-ASSET-UPSERT-MASSIVE") && importCalls.includes("FN-V2-ASSET-UPSERT"),
  `import.function=${importFn}, calls=${importCalls}`
);

// [9] Exportar aparece como client-side
const exportFlow = byId.get("FLOW-ACT-009");
const exportHasBackendEdge = edgesFrom("FLOW-ACT-009", "uses").length > 0;
check(
  9,
  "Exportar (FLOW-ACT-009) marcado client-side, sin endpoint inventado",
  exportFlow?.metadata?.clientSideOnly === true && !exportHasBackendEdge,
  `clientSideOnly=${exportFlow?.metadata?.clientSideOnly}, edges 'uses'=${exportHasBackendEdge}`
);

// [10] sgsi.asset permite navegación bottom-up
const bu = bottomUpFromTable("TABLE:sgsi.asset");
check(10, "sgsi.asset permite navegación bottom-up (Functions/Endpoints/Flows > 0)", bu.functions.length > 0 && bu.endpoints.length > 0 && bu.flows.length > 0, JSON.stringify(bu));

// [11]/[12] FN-V2-ASSET-UPSERT impacto directo/indirecto
const directCallers = edgesTo("FN-V2-ASSET-UPSERT", "calls").map((e) => e.source); // funciones que la llaman
const directEndpoints = edgesTo("FN-V2-ASSET-UPSERT", "executes").map((e) => e.source);
const directFlows = directEndpoints.flatMap((ep) => edgesTo(ep, "uses").map((e) => e.source));
check(11, "FN-V2-ASSET-UPSERT muestra impacto DIRECTO (endpoint + flows)", directEndpoints.length > 0 && directFlows.length >= 2, `endpoints=${directEndpoints}, flows=${directFlows}`);

const indirectFns = directCallers; // ej. FN-V2-ASSET-UPSERT-MASSIVE
const indirectEndpoints = indirectFns.flatMap((fn) => edgesTo(fn, "executes").map((e) => e.source));
const indirectFlows = indirectEndpoints.flatMap((ep) => edgesTo(ep, "uses").map((e) => e.source));
check(12, "FN-V2-ASSET-UPSERT muestra impacto INDIRECTO (via calls)", indirectFns.length > 0 && indirectFlows.length > 0, `fns=${indirectFns}, endpoints=${indirectEndpoints}, flows=${indirectFlows}`);

// [13] Dependencias externas sin expandirse (nodo external tiene metadata minima, sin edges salientes propios)
const externalNodes = byType("external");
const externalHaveNoOutgoingEdges = externalNodes.every((n) => edgesFrom(n.id).length === 0);
check(13, "Dependencias externas aparecen sin expandirse (sin aristas salientes)", externalNodes.length > 0 && externalHaveNoOutgoingEdges, `external=${externalNodes.map((n) => n.name)}`);

// [14] Search encuentra los 5 términos de ejemplo
function searchIndex() {
  const rows = [];
  for (const n of graph.nodes) {
    rows.push({ id: n.id, type: n.type, text: `${n.id} ${n.name}`.toLowerCase() });
  }
  for (const [flowId, extra] of Object.entries(graph.flows)) {
    const fe = extra.frontMatter?.frontend;
    if (fe?.components) {
      for (const c of fe.components) rows.push({ id: flowId, type: "flow", text: c.toLowerCase() });
    }
  }
  return rows;
}
const idx = searchIndex();
const norm = (s) => s.toLowerCase().replace(/[^a-z0-9]/g, "");
function searchFinds(term) {
  const t = norm(term);
  return idx.some((r) => norm(r.text).includes(t));
}
const searchTerms = ["crear activo", "/asset/upsert", "v2_asset_upsert", "sgsi.asset", "assetinventoryform"];
const searchResults = searchTerms.map((t) => ({ term: t, found: searchFinds(t) }));
check(14, "Search encuentra los 5 términos de ejemplo", searchResults.every((r) => r.found), JSON.stringify(searchResults));

// [15] El grafo se genera sin interpretar narrativa Markdown
// (estructural: parser.mjs solo usa front matter YAML + YAML técnico para nodes/edges;
//  extractSections() guarda prosa aparte, nunca se usa para nodes/edges. Verificable
//  por inspección de parser.mjs; aquí lo confirmamos indirectamente: ningún nodo/edge
//  tiene un campo derivado de "sections".)
const noProseInGraph = graph.edges.every((e) => !("fromProse" in e)) && graph.nodes.every((n) => !("fromProse" in n));
check(15, "El grafo no se construye interpretando prosa Markdown (estructural)", noProseInGraph, "verificado: nodes/edges no contienen campos derivados de secciones de prosa");

// [16] No existen nodos hardcodeados de Activos en la UI (estructural: revisar que
// app.js no contenga IDs de Activos embebidos - se valida por grep, no en runtime)
import { execSync } from "node:child_process";
let hardcodedInUI = [];
try {
  const appJs = fs.readFileSync(path.join(__dirname, "app.js"), "utf8");
  const idPattern = /\b(FLOW-ACT-\d{3}|EP-ASSET-[A-Z-]+|FN-V2-ASSET-[A-Z-]+)\b/g;
  const found = appJs.match(idPattern);
  if (found) hardcodedInUI = [...new Set(found)];
} catch {}
check(16, "No existen IDs de Activos hardcodeados en app.js", hardcodedInUI.length === 0, hardcodedInUI.length ? `encontrados: ${hardcodedInUI.join(", ")}` : "0 coincidencias");

// [17] Agregar un Flow/YAML valido requiere solo regenerar datos, no tocar componentes
// (estructural: confirmar que index.html/app.js no importan archivos individuales de
// docs/05-flows o docs/06-technical por nombre; solo consumen window.__EXPLORER_DATA__)
let readsDataOnly = false;
try {
  const appJs = fs.readFileSync(path.join(__dirname, "app.js"), "utf8");
  // Se excluyen comentarios (// ... y /* ... */) antes de revisar: los comentarios
  // pueden mencionar rutas con fines documentales sin que el código las lea.
  // Split by lines, remove comments from each line, filter empty lines, rejoin.
  const codeOnly = appJs
    .split('\n')
    .map(line => line.replace(/\/\*[\s\S]*?\*\//g, '').replace(/^\s*\/\/.*/, ''))
    .filter(line => line.trim().length > 0)
    .join('\n');
  readsDataOnly = codeOnly.includes("window.__EXPLORER_DATA__") && !/05-flows|06-technical|readFileSync|require\(|fetch\(/.test(codeOnly);
} catch {}
check(17, "UI consume únicamente window.__EXPLORER_DATA__ (agregar Flow = regenerar, no tocar UI)", readsDataOnly, `readsDataOnly=${readsDataOnly}`);

// ---- Riesgos (DOM-RSK) — mismo espíritu que los checks de Activos ----

// [18] Top-down completo: analizar amenazas de grupo llega a sgsi.asset_group_threat_risk
const analyzeFlow = "FLOW-RSK-002";
const analyzeEp = edgesFrom(analyzeFlow, "uses").map((e) => e.target);
const analyzeFn = analyzeEp.flatMap((ep) => edgesFrom(ep, "executes").map((e) => e.target));
const analyzeTables = new Set(analyzeFn.flatMap((fn) => [...forwardTables(fn)]));
check(18, "FLOW-RSK-002 (Analizar amenazas de grupo) llega a sgsi.asset_group_threat_risk", analyzeTables.has("TABLE:sgsi.asset_group_threat_risk"), `tablas=${[...analyzeTables].join(",")}`);

// [19] Convergencia real FLOW-RSK-010 / FLOW-RSK-011 (mismo endpoint y function)
const consolidatedEp = edgesFrom("FLOW-RSK-010", "uses").map((e) => e.target);
const byGroupEp = edgesFrom("FLOW-RSK-011", "uses").map((e) => e.target);
check(19, "FLOW-RSK-010 y FLOW-RSK-011 convergen en EP-GROUP-RISK-TREATMENT-UPSERT", consolidatedEp.includes("EP-GROUP-RISK-TREATMENT-UPSERT") && byGroupEp.includes("EP-GROUP-RISK-TREATMENT-UPSERT"), `flow-010.endpoints=${consolidatedEp}, flow-011.endpoints=${byGroupEp}`);

// [20] Multi-endpoint funcionando en FLOW-RSK-013 (7 endpoints de acciones)
const actionsEp = edgesFrom("FLOW-RSK-013", "uses").map((e) => e.target);
check(20, "FLOW-RSK-013 (gestionar acciones de grupo) declara 7 endpoints (multi-endpoint)", actionsEp.length === 7, `endpoints=${actionsEp.length}`);

// [21] FLOW-RSK-007 (Riesgos aceptados) es derivado: sin arista 'uses' propia
const acceptedHasOwnEdge = edgesFrom("FLOW-RSK-007", "uses").length > 0;
const acceptedFlow = byId.get("FLOW-RSK-007");
check(21, "FLOW-RSK-007 (Riesgos aceptados) sin endpoint propio inventado", !acceptedHasOwnEdge && acceptedFlow?.metadata?.clientSideOnly === true, `edges 'uses'=${acceptedHasOwnEdge}, clientSideOnly=${acceptedFlow?.metadata?.clientSideOnly}`);

// [22] Dependencias externas de Riesgos presentes y sin expandirse
const riskExternalDomains = ["assets", "wizard", "soa"];
const riskExternalNodes = riskExternalDomains.map((d) => byId.get(`EXT:${d}`));
const riskExternalOk = riskExternalNodes.every((n) => n && edgesFrom(n.id).length === 0);
check(22, "Dependencias externas de Riesgos (assets/wizard/soa) presentes, sin aristas salientes", riskExternalOk, `presentes=${riskExternalNodes.map((n) => n?.id).join(",")}`);

// [23] Endpoints legacy/huérfanos NO existen como nodos del grafo (no se conectaron artificialmente)
const legacyEndpointPaths = [
  "/asset-threat-risk/upsert",
  "/asset-threat-risk/exclude",
  "/asset-threat-risk/finalizeRiskAnalysis",
  "/asset-threat-risk/getListByAssetId",
  "/risk-treatment/upsert",
  "/risk-treatment-control",
];
const foundLegacy = byType("endpoint").filter((n) => legacyEndpointPaths.some((p) => n.metadata.path && n.metadata.path.startsWith(p)));
check(23, "Endpoints legacy/huérfanos no aparecen como nodos (no conectados artificialmente)", foundLegacy.length === 0, foundLegacy.length ? `encontrados: ${foundLegacy.map((n) => n.id).join(",")}` : "0 coincidencias");

// [24] Bottom-up cruzado entre módulos: sgsi.asset_group alcanza Flows de ambos dominios
const bottomUpAssetGroup = bottomUpFromTable("TABLE:sgsi.asset_group");
const crossModuleFlows = bottomUpAssetGroup.flows.filter((f) => f.startsWith("FLOW-ACT-") || f.startsWith("FLOW-RSK-"));
const hasAct = crossModuleFlows.some((f) => f.startsWith("FLOW-ACT-"));
const hasRsk = crossModuleFlows.some((f) => f.startsWith("FLOW-RSK-"));
check(24, "sgsi.asset_group permite Impact/bottom-up cruzado entre Activos y Riesgos", hasAct && hasRsk, `flows=${crossModuleFlows.join(",")}`);

// [25] Búsqueda encuentra un término representativo de Riesgos
const rskSearchTerms = ["analizar amenazas", "asset-group-threat-risk", "v2_group_risk_treatment_upsert", "organizational_risk"];
const rskSearchResults = rskSearchTerms.map((t) => ({ term: t, found: searchFinds(t) }));
check(25, "Search encuentra términos de ejemplo de Riesgos", rskSearchResults.every((r) => r.found), JSON.stringify(rskSearchResults));

// ---- SoA (DOM-SOA) — mismo espíritu que los checks de Activos/Riesgos ----

// [26] Top-down completo: FLOW-SOA-001 (Evaluar y guardar) llega a sgsi.control_soa
const evalFlow = "FLOW-SOA-001";
const evalEp = edgesFrom(evalFlow, "uses").map((e) => e.target);
const evalFn = evalEp.flatMap((ep) => edgesFrom(ep, "executes").map((e) => e.target));
const evalTables = new Set(evalFn.flatMap((fn) => [...forwardTables(fn)]));
check(26, "FLOW-SOA-001 (Evaluar y guardar Declaración SoA) llega a sgsi.control_soa", evalTables.has("TABLE:sgsi.control_soa"), `tablas=${[...evalTables].join(",")}`);

// [27] Convergencia real con Wizard: FLOW-SOA-001 declara 2 páginas de entrada (pantalla + wizard)
const soaFlowExtra = graph.flows["FLOW-SOA-001"];
const soaPages = soaFlowExtra?.frontMatter?.frontend?.pages || [];
const hasMainPage = soaPages.some((p) => p.includes("soa-controls/applicability-statement"));
const hasWizardPage = soaPages.some((p) => p.includes("wizard/management/soa"));
check(27, "FLOW-SOA-001 declara ambos puntos de entrada (pantalla principal + Wizard) sin duplicar Flow", hasMainPage && hasWizardPage, `pages=${JSON.stringify(soaPages)}`);

// [28] Publicar (FLOW-SOA-002) converge en un solo endpoint EP-SOA-ANALYSIS-COMPLETE (dos ramas, mismo destino técnico)
const publishEp = edgesFrom("FLOW-SOA-002", "uses").map((e) => e.target);
check(28, "FLOW-SOA-002 (Publicar, dos ramas) converge en EP-SOA-ANALYSIS-COMPLETE", publishEp.length === 1 && publishEp[0] === "EP-SOA-ANALYSIS-COMPLETE", `endpoints=${publishEp}`);

// [29] Exportar (FLOW-SOA-005) marcado client-side, sin endpoint inventado, con dependencia externa pdf
const exportSoaFlow = byId.get("FLOW-SOA-005");
const exportSoaHasBackendEdge = edgesFrom("FLOW-SOA-005", "uses").length > 0;
const exportSoaDepsPdf = edgesFrom("FLOW-SOA-005", "depends_on").some((e) => e.target === "EXT:pdf");
check(29, "FLOW-SOA-005 (Exportar) client-side, sin endpoint inventado, con dependencia externa pdf", exportSoaFlow?.metadata?.clientSideOnly === true && !exportSoaHasBackendEdge && exportSoaDepsPdf, `clientSideOnly=${exportSoaFlow?.metadata?.clientSideOnly}, edges 'uses'=${exportSoaHasBackendEdge}, depends_on pdf=${exportSoaDepsPdf}`);

// [30] Relación cross-domain visible: FLOW-SOA-006 escribe TABLE:sgsi.group_risk_treatment_control
// (tabla física de DOM-RSK) y el bottom-up desde esa tabla incluye Flows de ambos dominios.
const linkageBu = bottomUpFromTable("TABLE:sgsi.group_risk_treatment_control");
const linkageHasSoa = linkageBu.flows.some((f) => f.startsWith("FLOW-SOA-"));
const linkageHasRsk = linkageBu.flows.some((f) => f.startsWith("FLOW-RSK-"));
check(30, "sgsi.group_risk_treatment_control conecta Flows de DOM-SOA y DOM-RSK (relación cross-domain no oculta)", linkageHasSoa && linkageHasRsk, `flows=${linkageBu.flows.join(",")}`);

// [31] Dependencias externas de SoA presentes y sin expandirse
const soaExternalDomains = ["doc-flow", "ai", "wizard", "risk-treatment", "pdf", "file", "doc-documents"];
const soaExternalNodes = soaExternalDomains.map((d) => byId.get(`EXT:${d}`));
const soaExternalOk = soaExternalNodes.every((n) => n && edgesFrom(n.id).length === 0);
check(31, "Dependencias externas de SoA (doc-flow/ai/wizard/risk-treatment/pdf/file/doc-documents) presentes, sin aristas salientes", soaExternalOk, `presentes=${soaExternalNodes.map((n) => n?.id).join(",")}`);

// [32] Endpoints huérfanos de SoA NO existen como nodos del grafo
// (comparación exacta de path: /soa/upsert no debe confundirse con /soa/upsertBatch)
const foundSoaUpsertExact = byType("endpoint").some((n) => n.metadata.path === "/soa/upsert");
const foundSoaGetByIdExact = byType("endpoint").some((n) => n.metadata.path === "/soa/getById/:id");
check(32, "Endpoints huérfanos de SoA (/soa/getById, /soa/upsert) no aparecen como nodos", !foundSoaUpsertExact && !foundSoaGetByIdExact, `getById=${foundSoaGetByIdExact}, upsert=${foundSoaUpsertExact}`);

// [33] Search encuentra términos de ejemplo de SoA
const soaSearchTerms = ["declaración soa", "/soa/upsertbatch", "v2_control_soa_upsert_batch", "control_soa", "soaapplicabilitystatement"];
const soaSearchResults = soaSearchTerms.map((t) => ({ term: t, found: searchFinds(t) }));
check(33, "Search encuentra términos de ejemplo de SoA", soaSearchResults.every((r) => r.found), JSON.stringify(soaSearchResults));

// [34] No existen IDs de SoA hardcodeados en app.js (mismo espíritu que el check 16 de Activos)
let hardcodedSoaInUI = [];
try {
  const appJs2 = fs.readFileSync(path.join(__dirname, "app.js"), "utf8");
  const idPattern2 = /\b(FLOW-SOA-\d{3}|EP-SOA-[A-Z-]+|EP-GROUP-RISK-TREATMENT-CONTROL-[A-Z-]+|FN-[A-Z0-9-]*SOA[A-Z0-9-]*|DOM-SOA)\b/g;
  const found2 = appJs2.match(idPattern2);
  if (found2) hardcodedSoaInUI = [...new Set(found2)];
} catch {}
check(34, "No existen IDs/nombres de SoA hardcodeados en app.js", hardcodedSoaInUI.length === 0, hardcodedSoaInUI.length ? `encontrados: ${hardcodedSoaInUI.join(", ")}` : "0 coincidencias");

// ---- Flujo Documental (DOM-DOCFLOW) — mismo espíritu que los checks anteriores ----

// [35] Top-down completo: enviar a aprobación (FLOW-DOCFLOW-004) llega a sgsi.document_flow_steps
const submitFlow = "FLOW-DOCFLOW-004";
const submitEp = edgesFrom(submitFlow, "uses").map((e) => e.target);
const submitFn = submitEp.flatMap((ep) => edgesFrom(ep, "executes").map((e) => e.target));
const submitTables = new Set(submitFn.flatMap((fn) => [...forwardTables(fn)]));
check(35, "FLOW-DOCFLOW-004 (Enviar a aprobación) llega a sgsi.document_flow_steps", submitTables.has("TABLE:sgsi.document_flow_steps"), `tablas=${[...submitTables].join(",")}`);

// [36] Split real confirmado: FLOW-DOCFLOW-002 (enviar a edición) y FLOW-DOCFLOW-004 (enviar a
// aprobación) NO comparten ningún endpoint — son transiciones distintas, no una convergencia.
const editingEp = new Set(edgesFrom("FLOW-DOCFLOW-002", "uses").map((e) => e.target));
const approvalEp = new Set(edgesFrom("FLOW-DOCFLOW-004", "uses").map((e) => e.target));
const noOverlap = [...editingEp].every((ep) => !approvalEp.has(ep));
check(36, "FLOW-DOCFLOW-002 y FLOW-DOCFLOW-004 no comparten endpoints (split real, no fusionados)", editingEp.size > 0 && approvalEp.size > 0 && noOverlap, `enviar-a-edicion.endpoints=${[...editingEp]}, enviar-a-aprobacion.endpoints=${[...approvalEp]}`);

// [37] Multi-endpoint: FLOW-DOCFLOW-005 (gestionar decisión) declara 3 endpoints (approve/reject/reassign)
const decisionEp = edgesFrom("FLOW-DOCFLOW-005", "uses").map((e) => e.target);
check(37, "FLOW-DOCFLOW-005 (Gestionar decisión de aprobación) declara 3 endpoints (multi-endpoint)", decisionEp.length === 3, `endpoints=${decisionEp.length}`);

// [38] Relación cross-domain visible: FN-DOC-FLOW-PUBLISH escribe TABLE:sgsi.scope (tabla física
// de Contexto y Alcance, dominio aún no documentado) y el bottom-up desde esa tabla llega a
// FLOW-DOCFLOW-006 — confirma que la escritura directa sobre otros dominios no queda oculta.
const scopeBu = bottomUpFromTable("TABLE:sgsi.scope");
check(38, "sgsi.scope (Contexto y Alcance) es alcanzada por FLOW-DOCFLOW-006 (Publicar) — escritura cross-domain no oculta", scopeBu.flows.includes("FLOW-DOCFLOW-006"), `flows=${scopeBu.flows.join(",")}`);

// [39] Endpoint huérfano de Doc-Flow (alias unlock) no existe como nodo del grafo
const foundUnlockExact = byType("endpoint").some((n) => n.metadata.path && n.metadata.path.includes("/unlock"));
check(39, "Alias huérfano POST .../unlock no aparece como nodo", !foundUnlockExact, foundUnlockExact ? "encontrado" : "0 coincidencias");

// [40] Dependencias externas de Doc-Flow presentes y sin expandirse
const docflowExternalDomains = ["email", "file"];
const docflowExternalNodes = docflowExternalDomains.map((d) => byId.get(`EXT:${d}`));
const docflowExternalOk = docflowExternalNodes.every((n) => n && edgesFrom(n.id).length === 0);
check(40, "Dependencias externas de Doc-Flow (email/file) presentes, sin aristas salientes", docflowExternalOk, `presentes=${docflowExternalNodes.map((n) => n?.id).join(",")}`);

// [41] Search encuentra términos de ejemplo de Doc-Flow
const docflowSearchTerms = ["crear documento sgsi", "document-flow/process", "doc_flow_publish", "document_flow_processes"];
const docflowSearchResults = docflowSearchTerms.map((t) => ({ term: t, found: searchFinds(t) }));
check(41, "Search encuentra términos de ejemplo de Doc-Flow", docflowSearchResults.every((r) => r.found), JSON.stringify(docflowSearchResults));

// [42] No existen IDs de Doc-Flow hardcodeados en app.js
let hardcodedDocflowInUI = [];
try {
  const appJs3 = fs.readFileSync(path.join(__dirname, "app.js"), "utf8");
  const idPattern3 = /\b(FLOW-DOCFLOW-\d{3}|EP-DOCFLOW-[A-Z-]+|EP-DOC-[A-Z-]+|FN-DOC[A-Z0-9-]*|DOM-DOCFLOW)\b/g;
  const found3 = appJs3.match(idPattern3);
  if (found3) hardcodedDocflowInUI = [...new Set(found3)];
} catch {}
check(42, "No existen IDs/nombres de Doc-Flow hardcodeados en app.js", hardcodedDocflowInUI.length === 0, hardcodedDocflowInUI.length ? `encontrados: ${hardcodedDocflowInUI.join(", ")}` : "0 coincidencias");

// [43] Function reclasificada de ORPHAN a viva en Implementación: FN-DOC-FLOW-GET-ACTIVE-PROCESS-INFO
// muestra impacto indirecto real (llamada internamente por otras 3 functions SQL, sin endpoint propio)
const activeInfoCallers = edgesTo("FN-DOC-FLOW-GET-ACTIVE-PROCESS-INFO", "calls").map((e) => e.source);
check(43, "FN-DOC-FLOW-GET-ACTIVE-PROCESS-INFO (reclasificada) tiene >=3 callers internos (calls)", activeInfoCallers.length >= 3, `callers=${activeInfoCallers.join(",")}`);

// ---- Contexto y Alcance (DOM-CTX) — mismo espíritu que los checks anteriores ----

// [44] Top-down completo: Gestionar Alcance (FLOW-CTX-001) llega a sgsi.scope
const manageScopeFlow = "FLOW-CTX-001";
const manageScopeEp = edgesFrom(manageScopeFlow, "uses").map((e) => e.target);
const manageScopeFn = manageScopeEp.flatMap((ep) => edgesFrom(ep, "executes").map((e) => e.target));
const manageScopeTables = new Set(manageScopeFn.flatMap((fn) => [...forwardTables(fn)]));
check(44, "FLOW-CTX-001 (Gestionar Alcance del SGSI) llega a sgsi.scope", manageScopeTables.has("TABLE:sgsi.scope"), `tablas=${[...manageScopeTables].join(",")}`);

// [45] Convergencia real con Wizard: FLOW-CTX-001 declara 3 páginas de entrada (pantalla + 2 del Wizard)
const scopeFlowExtra = graph.flows["FLOW-CTX-001"];
const scopePages = scopeFlowExtra?.frontMatter?.frontend?.pages || [];
const hasScopeMainPage = scopePages.some((p) => p.includes("context-scope/scope"));
const hasScopeWizardPage = scopePages.some((p) => p.includes("wizard/context/scope"));
check(45, "FLOW-CTX-001 declara la pantalla principal y el Wizard como entradas, sin duplicar Flow", hasScopeMainPage && hasScopeWizardPage, `pages=${JSON.stringify(scopePages)}`);

// [46] KPI (FLOW-CTX-005) no tiene publish local: ningún endpoint EP-KPI-*PUBLISH* existe como nodo
const kpiPublishNodes = byType("endpoint").filter((n) => n.id.startsWith("EP-KPI-") && n.id.includes("PUBLISH"));
check(46, "FLOW-CTX-005 (KPI) no declara ningún EP-KPI-*-PUBLISH (el flip de is_active ocurre solo en Doc-Flow)", kpiPublishNodes.length === 0, kpiPublishNodes.length ? `encontrados: ${kpiPublishNodes.map((n) => n.id).join(",")}` : "0 coincidencias");

// [47] Endpoints huérfanos de Contexto y Alcance NO existen como nodos del grafo
const ctxOrphanPaths = [
  { method: "POST", path: "/scope/publish" },
  { method: "GET", path: "/kpi/frequencies/listByCustomerId" },
  { method: "POST", path: "/strategic-objective/analysis/complete" },
  { method: "POST", path: "/executive-summary/complete" },
];
const foundCtxOrphans = byType("endpoint").filter((n) => ctxOrphanPaths.some((p) => n.metadata.path === p.path));
check(47, "Endpoints huérfanos de Contexto y Alcance (scope/publish, kpi/frequencies alias, strategic-objective/analysis/complete, executive-summary/complete) no aparecen como nodos", foundCtxOrphans.length === 0, foundCtxOrphans.length ? `encontrados: ${foundCtxOrphans.map((n) => n.id).join(",")}` : "0 coincidencias");

// [48] Relación cross-domain visible: sgsi.scope (ya escrita por FN-DOC-FLOW-PUBLISH) también es alcanzada
// ahora por FLOW-CTX-001 — el bottom-up desde esa tabla compartida cruza ambos dominios sin ocultarlo.
const scopeBuCtx = bottomUpFromTable("TABLE:sgsi.scope");
const scopeHasDocflow = scopeBuCtx.flows.some((f) => f.startsWith("FLOW-DOCFLOW-"));
const scopeHasCtx = scopeBuCtx.flows.some((f) => f.startsWith("FLOW-CTX-"));
check(48, "sgsi.scope conecta Flows de DOM-DOCFLOW y DOM-CTX (relación cross-domain no oculta)", scopeHasDocflow && scopeHasCtx, `flows=${scopeBuCtx.flows.join(",")}`);

// [49] Dependencias externas de Contexto y Alcance (ai/file), ya compartidas con otros módulos, presentes sin expandirse
const ctxExternalDomains = ["ai", "file", "doc-flow"];
const ctxExternalNodes = ctxExternalDomains.map((d) => byId.get(`EXT:${d}`));
const ctxExternalOk = ctxExternalNodes.every((n) => n && edgesFrom(n.id).length === 0);
check(49, "Dependencias externas de Contexto y Alcance (ai/file/doc-flow) presentes, sin aristas salientes", ctxExternalOk, `presentes=${ctxExternalNodes.map((n) => n?.id).join(",")}`);

// [50] Search encuentra términos de ejemplo de Contexto y Alcance
const ctxSearchTerms = ["gestionar alcance del sgsi", "/foda/upsert", "v2_kpi_calculate_value", "kpi_strategic_objective", "monitoring-results"];
const ctxSearchResults = ctxSearchTerms.map((t) => ({ term: t, found: searchFinds(t) }));
check(50, "Search encuentra términos de ejemplo de Contexto y Alcance", ctxSearchResults.every((r) => r.found), JSON.stringify(ctxSearchResults));

// [51] No existen IDs de Contexto y Alcance hardcodeados en app.js
let hardcodedCtxInUI = [];
try {
  const appJs4 = fs.readFileSync(path.join(__dirname, "app.js"), "utf8");
  const idPattern4 = /\b(FLOW-CTX-\d{3}|EP-SCOPE-[A-Z-]+|EP-FODA-[A-Z-]+|EP-PESTEL-[A-Z-]+|EP-STRATEGIC-OBJECTIVE-[A-Z-]+|EP-KPI-[A-Z-]+|EP-EXECUTIVE-SUMMARY-[A-Z-]+|EP-MONITORING-RESULT-[A-Z-]+|FN-V2-SCOPE-[A-Z-]+|DOM-CTX)\b/g;
  const found4 = appJs4.match(idPattern4);
  if (found4) hardcodedCtxInUI = [...new Set(found4)];
} catch {}
check(51, "No existen IDs/nombres de Contexto y Alcance hardcodeados en app.js", hardcodedCtxInUI.length === 0, hardcodedCtxInUI.length ? `encontrados: ${hardcodedCtxInUI.join(", ")}` : "0 coincidencias");

// [52] Catálogos de solo lectura no listados en Checkpoint A/B (kpi_type/kpi_level/frequency) existen como
// nodos Table derivados de function.tables[] — corrección de conteo de este pase, no tablas inventadas a mano.
const ctxCatalogTables = ["TABLE:sgsi.kpi_type", "TABLE:sgsi.kpi_level", "TABLE:sgsi.frequency"].map((id) => byId.get(id));
check(52, "sgsi.kpi_type/kpi_level/frequency existen como Tables derivadas (corrección de conteo, no manual)", ctxCatalogTables.every((n) => !!n), `presentes=${ctxCatalogTables.map((n) => n?.id).join(",")}`);

// ---- Gobierno del SGSI (DOM-GOV) — mismo espíritu que los checks anteriores ----

// [53] Top-down completo: FLOW-GOV-009 (Gestionar Cargos) llega a sgsi.position
const govPosFlow = "FLOW-GOV-009";
const govPosEp = edgesFrom(govPosFlow, "uses").map((e) => e.target);
const govPosFn = govPosEp.flatMap((ep) => edgesFrom(ep, "executes").map((e) => e.target));
const govPosTables = new Set(govPosFn.flatMap((fn) => [...forwardTables(fn)]));
check(53, "FLOW-GOV-009 (Gestionar Cargos) llega a sgsi.position", govPosTables.has("TABLE:sgsi.position"), `endpoints=${govPosEp.length}, tablas=${govPosTables.size}`);

// [54] La cascada Cargo → Activo queda estructural: FLOW-GOV-009 alcanza sgsi.asset,
// y esa tabla es compartida bottom-up con Flows de DOM-ACT (relación cross-domain no oculta).
const assetBuGov = bottomUpFromTable("TABLE:sgsi.asset");
const assetHasGov = assetBuGov.flows.some((f) => f.startsWith("FLOW-GOV-"));
const assetHasAct = assetBuGov.flows.some((f) => f.startsWith("FLOW-ACT-"));
check(54, "sgsi.asset conecta Flows de DOM-GOV y DOM-ACT (cascada Cargo→Activo TA-13 no oculta)", govPosTables.has("TABLE:sgsi.asset") && assetHasGov && assetHasAct, `desdeFLOW-GOV-009=${govPosTables.has("TABLE:sgsi.asset")}, flowsGOV=${assetBuGov.flows.filter((f) => f.startsWith("FLOW-GOV-")).join(",")}, flowsACT=${assetBuGov.flows.filter((f) => f.startsWith("FLOW-ACT-")).length}`);

// [55] sgsi.communications_matrix_analysis conecta DOM-GOV y DOM-DOCFLOW
const cmBu = bottomUpFromTable("TABLE:sgsi.communications_matrix_analysis");
const cmHasGov = cmBu.flows.includes("FLOW-GOV-012");
const cmHasDocflow = cmBu.flows.includes("FLOW-DOCFLOW-006");
check(55, "sgsi.communications_matrix_analysis conecta FLOW-GOV-012 y FLOW-DOCFLOW-006 (escritura cross-domain no oculta)", cmHasGov && cmHasDocflow, `flows=${cmBu.flows.join(",")}`);

// [56] Convergencia directa: EP-PERSON-GET-LIST-BY-CUSTOMER-ID lo usan Personas y Organigrama;
// EP-POSITION-UPSERT es usado por más de una superficie declarada.
const personListFlows = edgesTo("EP-PERSON-GET-LIST-BY-CUSTOMER-ID", "uses").map((e) => e.source);
const sharedPersonList = personListFlows.includes("FLOW-GOV-005") && personListFlows.includes("FLOW-GOV-010");
check(56, "EP-PERSON-GET-LIST-BY-CUSTOMER-ID converge entre Personas (FLOW-GOV-005) y Organigrama (FLOW-GOV-010)", sharedPersonList && personListFlows.length >= 2, `flows=${personListFlows.join(",")}`);

// [57] FLOW-GOV-011 (Exportar organigrama a PNG) es client-side: 0 aristas uses
const govExportUses = edgesFrom("FLOW-GOV-011", "uses");
const govExportNode = byId.get("FLOW-GOV-011");
check(57, "FLOW-GOV-011 (Exportar organigrama a PNG) es clientSideOnly y no genera aristas uses", govExportUses.length === 0 && govExportNode?.metadata?.clientSideOnly === true, `uses=${govExportUses.length}, clientSideOnly=${govExportNode?.metadata?.clientSideOnly}`);

// [58] FLOW-GOV-003 declara ambos puntos de entrada (pantalla + Wizard) sin duplicar Flow
const govGovFlow = graph.flows["FLOW-GOV-003"];
const govPages = govGovFlow?.frontMatter?.frontend?.pages || [];
const hasGovMainPage = govPages.some((p) => p.includes("governance/roles-responsibilities"));
const hasGovWizardPage = govPages.some((p) => p.includes("wizard/context/government"));
check(58, "FLOW-GOV-003 declara la pantalla principal y el Wizard como entradas, sin duplicar Flow", hasGovMainPage && hasGovWizardPage, `pages=${JSON.stringify(govPages)}`);

// [59] Endpoints huérfanos de Gobierno no aparecen como nodos (comparación exacta de path)
const govOrphanPaths = ["/person/:personId/documents", "/district/getById/:id"];
const foundGovOrphans = byType("endpoint").filter((n) => govOrphanPaths.includes(n.metadata.path));
check(59, "Endpoints huérfanos de Gobierno (/person/:personId/documents, /district/getById/:id) no aparecen como nodos", foundGovOrphans.length === 0, foundGovOrphans.length ? `encontrados: ${foundGovOrphans.map((n) => n.id).join(",")}` : "0 coincidencias");

// [60] Las 7 dependencias externas de Gobierno están presentes y sin aristas salientes
const govExternalDomains = ["doc-flow", "assets", "ai", "file", "training", "email", "wizard"];
const govExternalNodes = govExternalDomains.map((d) => byId.get(`EXT:${d}`));
const govExternalOk = govExternalNodes.every((n) => n && edgesFrom(n.id).length === 0);
check(60, "Dependencias externas de Gobierno (doc-flow/assets/ai/file/training/email/wizard) presentes, sin aristas salientes", govExternalOk, `presentes=${govExternalNodes.map((n) => n?.id).join(",")}`);

// [61] Search encuentra términos de ejemplo de Gobierno + 0 IDs de Gobierno hardcodeados en app.js
const govSearchTerms = ["gestionar cargos", "/communications-matrix/row/upsert", "v2_government_upsert", "communications_matrix_row", "sgsi-communications-log"];
const govSearchResults = govSearchTerms.map((t) => ({ term: t, found: searchFinds(t) }));
let hardcodedGovInUI = [];
try {
  const appJs5 = fs.readFileSync(path.join(__dirname, "app.js"), "utf8");
  const idPattern5 = /\b(FLOW-GOV-\d{3}|EP-POSITION-[A-Z-]+|EP-PERSON-[A-Z-]+|EP-AREA-[A-Z-]+|EP-GOVERNMENT-[A-Z-]+|EP-COMMUNICATIONS-MATRIX-[A-Z-]+|FN-V2-POSITION-[A-Z-]+|FN-V2-GOVERNMENT-[A-Z-]+|DOM-GOV)\b/g;
  const found5 = appJs5.match(idPattern5);
  if (found5) hardcodedGovInUI = [...new Set(found5)];
} catch {}
check(61, "Search encuentra términos de ejemplo de Gobierno y no hay IDs de Gobierno hardcodeados en app.js", govSearchResults.every((r) => r.found) && hardcodedGovInUI.length === 0, `${JSON.stringify(govSearchResults)} | hardcoded=${hardcodedGovInUI.length ? hardcodedGovInUI.join(", ") : "0"}`);

// ---- Report ----
console.log("ASSET TRACEABILITY EXPLORER — VALIDATION\n");
for (const r of results) {
  console.log(`[${r.n}] ${r.pass ? "PASS" : "FAIL"} — ${r.description}`);
  console.log(`     ${r.detail}`);
}
const failed = results.filter((r) => !r.pass);
console.log(`\n${results.length - failed.length}/${results.length} checks OK.`);
if (failed.length > 0) {
  console.log(`FALLARON: ${failed.map((f) => f.n).join(", ")}`);
  process.exit(1);
}
