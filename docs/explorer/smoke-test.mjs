// smoke-test.mjs — headless DOM check (jsdom) that the Explorer actually renders
// and its main interactions don't throw. Dev-only, not shipped with the prototype.
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { JSDOM } from "jsdom";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const html = fs.readFileSync(path.join(__dirname, "index.html"), "utf8");
const dataJs = fs.readFileSync(path.join(__dirname, "data.js"), "utf8");
const appJs = fs.readFileSync(path.join(__dirname, "app.js"), "utf8");

const errors = [];
const dom = new JSDOM(html, { runScripts: "outside-only", url: "http://localhost/index.html" });
const { window } = dom;
window.onerror = (msg) => errors.push(String(msg));

dom.window.eval(dataJs);
dom.window.eval(appJs);

function assert(cond, msg) {
  if (!cond) errors.push("ASSERT FAIL: " + msg);
}

const doc = window.document;

// 1. Home renders with correct computed stats (not hardcoded) — 11 dominios + 2 READ-ONLY AGGREGATORS: Activos + Riesgos + SoA + Doc-Flow + Contexto + Gobierno + Partes + Seguridad + Capacitaciones + Iniciativas + Revisiones + Dashboard + Inbox
const statNums = [...doc.querySelectorAll(".stat-card .num")].map((n) => n.textContent);
assert(statNums.includes("81"), `Home debe mostrar 81 flows (76 FROZEN + 5 DOCUMENTED + 0 Aggregators), vi: ${statNums}`);
assert(statNums.includes("250"), `Home debe mostrar 250 endpoints (228 FROZEN + 16 DOCUMENTED + 4 Dashboard + 2 Inbox), vi: ${statNums}`);
assert(statNums.includes("285"), `Home debe mostrar 285 functions (261 FROZEN + 16 DOCUMENTED + 4 Dashboard + 4 Inbox), vi: ${statNums}`);
assert(statNums.includes("140"), `Home debe mostrar 140 tables (137 FROZEN + 2 DOCUMENTED + 1 convergencia Dashboard), vi: ${statNums}`);
assert(doc.querySelectorAll(".flow-tile").length === 81, `Deben listarse 81 flow-tiles (incluyendo 9 de DOM-SEC, 5 de nuevos dominios), vi: ${doc.querySelectorAll(".flow-tile").length}`);

// 2. Sidebar lists all node types
assert(doc.querySelectorAll("#sidebar .side-link").length > 1 + 13, "Sidebar debe listar Activos + 13 Flows + técnico");

// 3. Click a Flow tile -> flow detail view renders with API/Database sections
const createTile = [...doc.querySelectorAll(".flow-tile")].find((t) => t.textContent.includes("Crear activo"));
assert(!!createTile, "Debe existir un tile para 'Crear activo'");
createTile.dispatchEvent(new window.Event("click", { bubbles: true }));
assert(doc.querySelector(".page-title").textContent.includes("Crear activo"), "Debe navegar a la ficha de Crear activo");
const pageText = doc.getElementById("content").textContent;
assert(pageText.includes("POST /asset/upsert"), "La ficha de Crear activo debe mostrar POST /asset/upsert");
assert(pageText.includes("sgsi.v2_asset_upsert"), "La ficha de Crear activo debe mostrar sgsi.v2_asset_upsert");

// 4. Trace mode button works and renders nodes
const traceBtn = [...doc.querySelectorAll("button")].find((b) => b.textContent.includes("Ver trazabilidad"));
assert(!!traceBtn, "Debe existir el botón 'Ver trazabilidad'");
traceBtn.dispatchEvent(new window.Event("click", { bubbles: true }));
assert(doc.querySelectorAll(".trace-node").length >= 3, `Trace mode debe pintar varios nodos, vi: ${doc.querySelectorAll(".trace-node").length}`);
assert(doc.getElementById("content").textContent.includes("sgsi.asset"), "El trace de Crear activo debe llegar a sgsi.asset");

// 5. Client-side flow (Exportar) shows badge, no API/Database backend chain
const homeLink = doc.querySelector('.side-link'); // "SGSI" (raíz)
homeLink.dispatchEvent(new window.Event("click", { bubbles: true }));
const exportLink = [...doc.querySelectorAll(".side-link")].find((l) => l.textContent.includes("Exportar activos"));
assert(!!exportLink, "Debe existir el link de sidebar 'Exportar activos a Excel'");
exportLink.dispatchEvent(new window.Event("click", { bubbles: true }));
assert(doc.querySelector(".client-side-badge") !== null, "Exportar debe mostrar el badge Client side only");
assert(!doc.getElementById("content").innerHTML.includes("Ver trazabilidad"), "Exportar (client-side) no debe ofrecer 'Ver trazabilidad'");

// 6. Impact mode on FN-V2-ASSET-UPSERT distinguishes direct/indirect
homeLink.dispatchEvent(new window.Event("click", { bubbles: true }));
const upsertFnLink = [...doc.querySelectorAll(".side-link")].find((l) => l.textContent.trim() === "sgsi.v2_asset_upsert");
assert(!!upsertFnLink, "Debe existir el link de sidebar para sgsi.v2_asset_upsert");
upsertFnLink.dispatchEvent(new window.Event("click", { bubbles: true }));
const impactBtn = [...doc.querySelectorAll("button")].find((b) => b.textContent.includes("Ver impacto"));
assert(!!impactBtn, "Debe existir el botón 'Ver impacto' en la ficha de función");
impactBtn.dispatchEvent(new window.Event("click", { bubbles: true }));
const directText = doc.querySelector(".impact-col.direct").textContent;
const indirectText = doc.querySelector(".impact-col.indirect").textContent;
assert(directText.includes("Crear activo") && directText.includes("Editar activo"), `Impact directo debe listar Crear/Editar, vi: ${directText}`);
assert(indirectText.includes("Importar"), `Impact indirecto debe listar Importar, vi: ${indirectText}`);

// 7. Search finds AssetInventoryForm
const searchInput = doc.getElementById("search-input");
searchInput.value = "AssetInventoryForm";
searchInput.dispatchEvent(new window.Event("input", { bubbles: true }));
const results = doc.getElementById("search-results").textContent;
assert(!doc.getElementById("search-results").classList.contains("hidden"), "El panel de resultados de búsqueda debe mostrarse");
assert(results.length > 0, "La búsqueda de AssetInventoryForm debe traer resultados");

// 8. Breadcrumbs reflect navigation
const crumbs = [...doc.querySelectorAll("#breadcrumbs .crumb")].map((c) => c.textContent);
assert(crumbs[0] === "SGSI", `El primer breadcrumb debe ser SGSI (raíz neutral, no un módulo específico), vi: ${crumbs}`);

// 9. Flow con múltiples endpoints (manage-asset-group) traza sin romperse
homeLink.dispatchEvent(new window.Event("click", { bubbles: true }));
const groupFlowLink = [...doc.querySelectorAll(".side-link")].find((l) => l.textContent.includes("activar / desactivar grupo"));
assert(!!groupFlowLink, "Debe existir el Flow de gestión de grupo en el sidebar");
groupFlowLink.dispatchEvent(new window.Event("click", { bubbles: true }));
const groupTraceBtn = [...doc.querySelectorAll("button")].find((b) => b.textContent.includes("Ver trazabilidad"));
groupTraceBtn.dispatchEvent(new window.Event("click", { bubbles: true }));
assert(doc.querySelectorAll(".trace-branch").length === 4, `El Flow de grupo debe pintar 4 ramas (una por endpoint), vi: ${doc.querySelectorAll(".trace-branch").length}`);
assert(doc.getElementById("content").textContent.includes("sgsi.v2_asset_delete_by_id"), "La rama de desactivar debe llegar en cascada a sgsi.v2_asset_delete_by_id");

// 10. Table detail (sgsi.asset): written by / read by / flows afectados, todo calculado
homeLink.dispatchEvent(new window.Event("click", { bubbles: true }));
const assetTableLink = [...doc.querySelectorAll(".side-link")].find((l) => l.textContent.trim() === "sgsi.asset");
assert(!!assetTableLink, "Debe existir el link de sidebar para la tabla sgsi.asset");
assetTableLink.dispatchEvent(new window.Event("click", { bubbles: true }));
assert(doc.getElementById("content").textContent.includes("Written by"), "La ficha de tabla debe mostrar 'Written by'");
const detailFlows = doc.getElementById("detail").textContent;
assert(detailFlows.includes("Crear activo"), `El panel de detalle de sgsi.asset debe listar Flows afectados incl. Crear activo, vi: ${detailFlows}`);

// 11. Riesgos: navegar a una Operación de Riesgos, ver su ficha con multi-endpoint, y su Trace Mode
homeLink.dispatchEvent(new window.Event("click", { bubbles: true }));
const riskFlowLink = [...doc.querySelectorAll(".side-link")].find((l) => l.textContent.includes("Analizar amenazas y vulnerabilidades"));
assert(!!riskFlowLink, "Debe existir el Flow de Riesgos 'Analizar amenazas y vulnerabilidades' en el sidebar");
riskFlowLink.dispatchEvent(new window.Event("click", { bubbles: true }));
assert(doc.querySelector(".page-title").textContent.includes("Analizar amenazas y vulnerabilidades"), "Debe navegar a la ficha de la Operación de Riesgos");
const riskTraceBtn = [...doc.querySelectorAll("button")].find((b) => b.textContent.includes("Ver trazabilidad"));
assert(!!riskTraceBtn, "Debe existir el botón 'Ver trazabilidad' en la Operación de Riesgos");
riskTraceBtn.dispatchEvent(new window.Event("click", { bubbles: true }));
assert(doc.getElementById("content").textContent.includes("sgsi.asset_group_threat_risk"), "El trace de Riesgos debe llegar a sgsi.asset_group_threat_risk");

// 12. Riesgos multi-endpoint: FLOW-RSK-013 pinta 7 ramas (una por endpoint de acciones)
homeLink.dispatchEvent(new window.Event("click", { bubbles: true }));
const actionsFlowLink = [...doc.querySelectorAll(".side-link")].find((l) => l.textContent.includes("Gestionar acciones, avance y evidencia"));
assert(!!actionsFlowLink, "Debe existir el Flow de Riesgos de gestión de acciones en el sidebar");
actionsFlowLink.dispatchEvent(new window.Event("click", { bubbles: true }));
const actionsTraceBtn = [...doc.querySelectorAll("button")].find((b) => b.textContent.includes("Ver trazabilidad"));
actionsTraceBtn.dispatchEvent(new window.Event("click", { bubbles: true }));
assert(doc.querySelectorAll(".trace-branch").length === 7, `El Flow de acciones de Riesgos debe pintar 7 ramas, vi: ${doc.querySelectorAll(".trace-branch").length}`);

// 13. Impact Mode cruzado: sgsi.asset_group (tabla de Activos) afecta también Operaciones de Riesgos
homeLink.dispatchEvent(new window.Event("click", { bubbles: true }));
const assetGroupTableLink = [...doc.querySelectorAll(".side-link")].find((l) => l.textContent.trim() === "sgsi.asset_group");
assert(!!assetGroupTableLink, "Debe existir el link de sidebar para la tabla sgsi.asset_group");
assetGroupTableLink.dispatchEvent(new window.Event("click", { bubbles: true }));
const groupImpactBtn = [...doc.querySelectorAll("button")].find((b) => b.textContent.includes("Ver impacto"));
assert(!!groupImpactBtn, "Debe existir el botón 'Ver impacto' en la ficha de sgsi.asset_group");
groupImpactBtn.dispatchEvent(new window.Event("click", { bubbles: true }));
const impactFullText = doc.getElementById("content").textContent;
assert(impactFullText.includes("Crear activo") || impactFullText.includes("Editar activo"), "Impact de sgsi.asset_group debe incluir Operaciones de Activos");
assert(impactFullText.includes("Analizar amenazas") || impactFullText.includes("Finalizar análisis") || impactFullText.includes("grupos pendientes"), `Impact de sgsi.asset_group debe cruzar hacia Operaciones de Riesgos, vi: ${impactFullText.slice(0, 400)}`);

// 14. Search encuentra un término de Riesgos
homeLink.dispatchEvent(new window.Event("click", { bubbles: true }));
searchInput.value = "organizational_risk";
searchInput.dispatchEvent(new window.Event("input", { bubbles: true }));
assert(!doc.getElementById("search-results").classList.contains("hidden"), "La búsqueda de 'organizational_risk' debe mostrar resultados");
assert(doc.getElementById("search-results").textContent.length > 0, "La búsqueda de 'organizational_risk' debe traer resultados");

// 15. SoA: navegar a la Operación de evaluación (FLOW-SOA-001), Trace Mode llega a sgsi.control_soa
homeLink.dispatchEvent(new window.Event("click", { bubbles: true }));
const soaEvalLink = [...doc.querySelectorAll(".side-link")].find((l) => l.textContent.includes("Evaluar y guardar Declaración SoA"));
assert(!!soaEvalLink, "Debe existir el Flow de SoA 'Evaluar y guardar Declaración SoA' en el sidebar");
soaEvalLink.dispatchEvent(new window.Event("click", { bubbles: true }));
assert(doc.querySelector(".page-title").textContent.includes("Evaluar y guardar Declaración SoA"), "Debe navegar a la ficha de la Operación de SoA");
const soaTraceBtn = [...doc.querySelectorAll("button")].find((b) => b.textContent.includes("Ver trazabilidad"));
assert(!!soaTraceBtn, "Debe existir el botón 'Ver trazabilidad' en la Operación de SoA");
soaTraceBtn.dispatchEvent(new window.Event("click", { bubbles: true }));
assert(doc.getElementById("content").textContent.includes("sgsi.control_soa"), "El trace de SoA (evaluación) debe llegar a sgsi.control_soa");

// 16. SoA multi-endpoint: FLOW-SOA-006 (vínculo de controles) pinta varias ramas (una por endpoint)
homeLink.dispatchEvent(new window.Event("click", { bubbles: true }));
const linkageFlowLink = [...doc.querySelectorAll(".side-link")].find((l) => l.textContent.includes("Vincular") && l.textContent.includes("controles"));
assert(!!linkageFlowLink, "Debe existir el Flow de SoA de vínculo de controles en el sidebar");
linkageFlowLink.dispatchEvent(new window.Event("click", { bubbles: true }));
const linkageTraceBtn = [...doc.querySelectorAll("button")].find((b) => b.textContent.includes("Ver trazabilidad"));
linkageTraceBtn.dispatchEvent(new window.Event("click", { bubbles: true }));
assert(doc.querySelectorAll(".trace-branch").length === 4, `El Flow de vínculo de controles debe pintar 4 ramas (una por endpoint), vi: ${doc.querySelectorAll(".trace-branch").length}`);
assert(doc.getElementById("content").textContent.includes("sgsi.group_risk_treatment_control"), "La rama de vínculo debe llegar a sgsi.group_risk_treatment_control");

// 17. SoA client-side: FLOW-SOA-005 (Exportar) muestra badge, sin trazabilidad backend, con dependencia externa pdf
homeLink.dispatchEvent(new window.Event("click", { bubbles: true }));
const soaExportLink = [...doc.querySelectorAll(".side-link")].find((l) => l.textContent.includes("Exportar Declaración SoA"));
assert(!!soaExportLink, "Debe existir el link de sidebar 'Exportar Declaración SoA'");
soaExportLink.dispatchEvent(new window.Event("click", { bubbles: true }));
assert(doc.querySelector(".client-side-badge") !== null, "Exportar SoA debe mostrar el badge Client side only");
assert(!doc.getElementById("content").innerHTML.includes("Ver trazabilidad"), "Exportar SoA (client-side) no debe ofrecer 'Ver trazabilidad'");
assert(doc.getElementById("content").textContent.toLowerCase().includes("pdf"), "La ficha de Exportar SoA debe mencionar la dependencia externa pdf");

// 18. Impact Mode cruzado: sgsi.group_risk_treatment_control (tabla física de Riesgos) afecta también la Operación de SoA
homeLink.dispatchEvent(new window.Event("click", { bubbles: true }));
const linkageTableLink = [...doc.querySelectorAll(".side-link")].find((l) => l.textContent.trim() === "sgsi.group_risk_treatment_control");
assert(!!linkageTableLink, "Debe existir el link de sidebar para la tabla sgsi.group_risk_treatment_control");
linkageTableLink.dispatchEvent(new window.Event("click", { bubbles: true }));
const linkageImpactBtn = [...doc.querySelectorAll("button")].find((b) => b.textContent.includes("Ver impacto"));
assert(!!linkageImpactBtn, "Debe existir el botón 'Ver impacto' en la ficha de sgsi.group_risk_treatment_control");
linkageImpactBtn.dispatchEvent(new window.Event("click", { bubbles: true }));
const linkageImpactText = doc.getElementById("content").textContent;
assert(linkageImpactText.includes("Vincular") || linkageImpactText.includes("vínculo") || linkageImpactText.includes("Vínculo"), "Impact de sgsi.group_risk_treatment_control debe incluir la Operación de SoA");
assert(linkageImpactText.includes("tratamiento") || linkageImpactText.includes("Definir tratamiento"), `Impact de sgsi.group_risk_treatment_control debe cruzar hacia Operaciones de Riesgos, vi: ${linkageImpactText.slice(0, 400)}`);

// 19. Search encuentra un término de SoA
homeLink.dispatchEvent(new window.Event("click", { bubbles: true }));
searchInput.value = "control_soa";
searchInput.dispatchEvent(new window.Event("input", { bubbles: true }));
assert(!doc.getElementById("search-results").classList.contains("hidden"), "La búsqueda de 'control_soa' debe mostrar resultados");
assert(doc.getElementById("search-results").textContent.length > 0, "La búsqueda de 'control_soa' debe traer resultados");

// 20. Doc-Flow: navegar a 'Enviar documento/entidad a aprobación' (FLOW-DOCFLOW-004), Trace Mode multi-endpoint
homeLink.dispatchEvent(new window.Event("click", { bubbles: true }));
const submitFlowLink = [...doc.querySelectorAll(".side-link")].find((l) => l.textContent.includes("Enviar documento/entidad a aprobación"));
assert(!!submitFlowLink, "Debe existir el Flow de Doc-Flow 'Enviar documento/entidad a aprobación' en el sidebar");
submitFlowLink.dispatchEvent(new window.Event("click", { bubbles: true }));
assert(doc.querySelector(".page-title").textContent.includes("Enviar documento/entidad a aprobación"), "Debe navegar a la ficha de la Operación de Doc-Flow");
const submitTraceBtn = [...doc.querySelectorAll("button")].find((b) => b.textContent.includes("Ver trazabilidad"));
assert(!!submitTraceBtn, "Debe existir el botón 'Ver trazabilidad' en la Operación de Doc-Flow");
submitTraceBtn.dispatchEvent(new window.Event("click", { bubbles: true }));
assert(doc.querySelectorAll(".trace-branch").length === 3, `El Flow de enviar a aprobación debe pintar 3 ramas (3 endpoints), vi: ${doc.querySelectorAll(".trace-branch").length}`);
assert(doc.getElementById("content").textContent.includes("sgsi.document_flow_steps") || doc.getElementById("content").textContent.includes("document_flow_processes"), "El trace de Doc-Flow debe llegar a sgsi.document_flow_processes/_steps");

// 21. Doc-Flow: split real confirmado — 'Enviar documento a edición' (FLOW-DOCFLOW-002) es una ficha distinta, con un solo endpoint propio
homeLink.dispatchEvent(new window.Event("click", { bubbles: true }));
const sendToEditingLink = [...doc.querySelectorAll(".side-link")].find((l) => l.textContent.includes("Enviar documento a edición"));
assert(!!sendToEditingLink, "Debe existir el Flow de Doc-Flow 'Enviar documento a edición' en el sidebar (split confirmado, no fusionado con 'a aprobación')");
sendToEditingLink.dispatchEvent(new window.Event("click", { bubbles: true }));
assert(doc.querySelector(".page-title").textContent.includes("Enviar documento a edición"), "Debe navegar a la ficha de 'Enviar documento a edición'");

// 22. Doc-Flow multi-endpoint: FLOW-DOCFLOW-005 (gestionar decisión) pinta 3 ramas (aprobar/rechazar/reasignar)
homeLink.dispatchEvent(new window.Event("click", { bubbles: true }));
const decisionFlowLink = [...doc.querySelectorAll(".side-link")].find((l) => l.textContent.includes("Gestionar decisión de aprobación"));
assert(!!decisionFlowLink, "Debe existir el Flow de Doc-Flow 'Gestionar decisión de aprobación' en el sidebar");
decisionFlowLink.dispatchEvent(new window.Event("click", { bubbles: true }));
const decisionTraceBtn = [...doc.querySelectorAll("button")].find((b) => b.textContent.includes("Ver trazabilidad"));
decisionTraceBtn.dispatchEvent(new window.Event("click", { bubbles: true }));
assert(doc.querySelectorAll(".trace-branch").length === 3, `El Flow de gestionar decisión debe pintar 3 ramas, vi: ${doc.querySelectorAll(".trace-branch").length}`);

// 23. Impact Mode cruzado: sgsi.scope (tabla física de Contexto y Alcance, no documentado aún) es alcanzada por
// Publicar (FLOW-DOCFLOW-006) — la escritura cross-domain de doc_flow_publish queda visible, no oculta
homeLink.dispatchEvent(new window.Event("click", { bubbles: true }));
const scopeTableLink = [...doc.querySelectorAll(".side-link")].find((l) => l.textContent.trim() === "sgsi.scope");
assert(!!scopeTableLink, "Debe existir el link de sidebar para la tabla sgsi.scope");
scopeTableLink.dispatchEvent(new window.Event("click", { bubbles: true }));
const scopeImpactBtn = [...doc.querySelectorAll("button")].find((b) => b.textContent.includes("Ver impacto"));
assert(!!scopeImpactBtn, "Debe existir el botón 'Ver impacto' en la ficha de sgsi.scope");
scopeImpactBtn.dispatchEvent(new window.Event("click", { bubbles: true }));
const scopeImpactText = doc.getElementById("content").textContent;
assert(scopeImpactText.includes("Publicar"), `Impact de sgsi.scope debe incluir la Operación 'Publicar documento/entidad' de Doc-Flow, vi: ${scopeImpactText.slice(0, 400)}`);

// 24. Search encuentra un término de Doc-Flow
homeLink.dispatchEvent(new window.Event("click", { bubbles: true }));
searchInput.value = "doc_flow_publish";
searchInput.dispatchEvent(new window.Event("input", { bubbles: true }));
assert(!doc.getElementById("search-results").classList.contains("hidden"), "La búsqueda de 'doc_flow_publish' debe mostrar resultados");
assert(doc.getElementById("search-results").textContent.length > 0, "La búsqueda de 'doc_flow_publish' debe traer resultados");

// 25. Contexto y Alcance: navegar a 'Gestionar Alcance del SGSI' (FLOW-CTX-001), Trace Mode llega a sgsi.scope
homeLink.dispatchEvent(new window.Event("click", { bubbles: true }));
const scopeFlowLink = [...doc.querySelectorAll(".side-link")].find((l) => l.textContent.includes("Gestionar Alcance del SGSI"));
assert(!!scopeFlowLink, "Debe existir el Flow de Contexto y Alcance 'Gestionar Alcance del SGSI' en el sidebar");
scopeFlowLink.dispatchEvent(new window.Event("click", { bubbles: true }));
assert(doc.querySelector(".page-title").textContent.includes("Gestionar Alcance del SGSI"), "Debe navegar a la ficha de la Operación de Contexto y Alcance");
const scopeTraceBtn = [...doc.querySelectorAll("button")].find((b) => b.textContent.includes("Ver trazabilidad"));
assert(!!scopeTraceBtn, "Debe existir el botón 'Ver trazabilidad' en la Operación de Alcance");
scopeTraceBtn.dispatchEvent(new window.Event("click", { bubbles: true }));
assert(doc.getElementById("content").textContent.includes("sgsi.scope"), "El trace de Alcance debe llegar a sgsi.scope");

// 26. Contexto y Alcance multi-endpoint: FLOW-CTX-007 (Seguimiento de KPIs) pinta varias ramas (una por endpoint)
homeLink.dispatchEvent(new window.Event("click", { bubbles: true }));
const monitoringFlowLink = [...doc.querySelectorAll(".side-link")].find((l) => l.textContent.includes("Registrar Seguimiento y Resultados de KPIs"));
assert(!!monitoringFlowLink, "Debe existir el Flow de Contexto y Alcance de Seguimiento de KPIs en el sidebar");
monitoringFlowLink.dispatchEvent(new window.Event("click", { bubbles: true }));
const monitoringTraceBtn = [...doc.querySelectorAll("button")].find((b) => b.textContent.includes("Ver trazabilidad"));
monitoringTraceBtn.dispatchEvent(new window.Event("click", { bubbles: true }));
assert(doc.querySelectorAll(".trace-branch").length === 8, `El Flow de Seguimiento de KPIs debe pintar 8 ramas (una por endpoint), vi: ${doc.querySelectorAll(".trace-branch").length}`);
assert(doc.getElementById("content").textContent.includes("sgsi.monitoring_result_monthly") || doc.getElementById("content").textContent.includes("sgsi.monitoring_result_periodic"), "La ficha de Seguimiento de KPIs debe mencionar las tablas de monitoreo");

// 27. Impact Mode cruzado: sgsi.scope (tabla de Contexto y Alcance) es alcanzada también por 'Publicar' de Doc-Flow
homeLink.dispatchEvent(new window.Event("click", { bubbles: true }));
const scopeTableLink2 = [...doc.querySelectorAll(".side-link")].find((l) => l.textContent.trim() === "sgsi.scope");
assert(!!scopeTableLink2, "Debe existir el link de sidebar para la tabla sgsi.scope");
scopeTableLink2.dispatchEvent(new window.Event("click", { bubbles: true }));
const scopeImpactBtn2 = [...doc.querySelectorAll("button")].find((b) => b.textContent.includes("Ver impacto"));
assert(!!scopeImpactBtn2, "Debe existir el botón 'Ver impacto' en la ficha de sgsi.scope");
scopeImpactBtn2.dispatchEvent(new window.Event("click", { bubbles: true }));
const scopeImpactText2 = doc.getElementById("content").textContent;
assert(scopeImpactText2.includes("Gestionar Alcance del SGSI"), "Impact de sgsi.scope debe incluir la Operación de Contexto y Alcance");
assert(scopeImpactText2.includes("Publicar"), `Impact de sgsi.scope debe cruzar hacia la Operación 'Publicar documento/entidad' de Doc-Flow, vi: ${scopeImpactText2.slice(0, 400)}`);

// 28. Contexto y Alcance: KPI (FLOW-CTX-005) no ofrece un endpoint de publish local propio
homeLink.dispatchEvent(new window.Event("click", { bubbles: true }));
const kpiFlowLink = [...doc.querySelectorAll(".side-link")].find((l) => l.textContent.includes("Gestionar KPIs del SGSI"));
assert(!!kpiFlowLink, "Debe existir el Flow de Contexto y Alcance 'Gestionar KPIs del SGSI' en el sidebar");
kpiFlowLink.dispatchEvent(new window.Event("click", { bubbles: true }));
const kpiTraceBtn = [...doc.querySelectorAll("button")].find((b) => b.textContent.includes("Ver trazabilidad"));
kpiTraceBtn.dispatchEvent(new window.Event("click", { bubbles: true }));
assert(!doc.getElementById("content").textContent.includes("kpi/analysis/publish"), "La ficha de KPI no debe mencionar un endpoint de publish local (no existe)");

// 29. Search encuentra un término de Contexto y Alcance
homeLink.dispatchEvent(new window.Event("click", { bubbles: true }));
searchInput.value = "kpi_strategic_objective";
searchInput.dispatchEvent(new window.Event("input", { bubbles: true }));
assert(!doc.getElementById("search-results").classList.contains("hidden"), "La búsqueda de 'kpi_strategic_objective' debe mostrar resultados");
assert(doc.getElementById("search-results").textContent.length > 0, "La búsqueda de 'kpi_strategic_objective' debe traer resultados");

// 30. Gobierno: 'Gestionar Cargos' (FLOW-GOV-009) — Trace Mode multi-endpoint que llega a
// sgsi.position Y a sgsi.asset (la cascada Cargo→Activo TA-13 queda visible en la UI, no oculta)
homeLink.dispatchEvent(new window.Event("click", { bubbles: true }));
const positionsFlowLink = [...doc.querySelectorAll(".side-link")].find((l) => l.textContent.includes("Gestionar Cargos"));
assert(!!positionsFlowLink, "Debe existir el Flow de Gobierno 'Gestionar Cargos' en el sidebar");
positionsFlowLink.dispatchEvent(new window.Event("click", { bubbles: true }));
assert(doc.querySelector(".page-title").textContent.includes("Gestionar Cargos"), "Debe navegar a la ficha de la Operación de Cargos");
const positionsTraceBtn = [...doc.querySelectorAll("button")].find((b) => b.textContent.includes("Ver trazabilidad"));
assert(!!positionsTraceBtn, "Debe existir el botón 'Ver trazabilidad' en la Operación de Cargos");
positionsTraceBtn.dispatchEvent(new window.Event("click", { bubbles: true }));
assert(doc.querySelectorAll(".trace-branch").length === 6, `El Flow de Cargos debe pintar 6 ramas (una por endpoint), vi: ${doc.querySelectorAll(".trace-branch").length}`);
const positionsTraceText = doc.getElementById("content").textContent;
assert(positionsTraceText.includes("sgsi.position"), "El trace de Cargos debe llegar a sgsi.position");
assert(positionsTraceText.includes("sgsi.asset"), "El trace de Cargos debe mostrar la cascada hacia sgsi.asset");

// 31. Gobierno client-side: 'Exportar el organigrama a PNG' (FLOW-GOV-011) muestra badge y no tiene cadena backend
homeLink.dispatchEvent(new window.Event("click", { bubbles: true }));
const orgExportLink = [...doc.querySelectorAll(".side-link")].find((l) => l.textContent.includes("Exportar el organigrama"));
assert(!!orgExportLink, "Debe existir el link de sidebar 'Exportar el organigrama a PNG'");
orgExportLink.dispatchEvent(new window.Event("click", { bubbles: true }));
assert(doc.querySelector(".client-side-badge") !== null, "Exportar organigrama debe mostrar el badge Client side only");
const orgExportText = doc.getElementById("content").textContent;
assert(!orgExportText.includes("/governance/chart/export"), "La ficha de Exportar organigrama no debe inventar un endpoint de exportación");

// 32. Gobierno: Registro de Comunicaciones (FLOW-GOV-012) multi-endpoint, y su tabla cruza con Doc-Flow
homeLink.dispatchEvent(new window.Event("click", { bubbles: true }));
const commsFlowLink = [...doc.querySelectorAll(".side-link")].find((l) => l.textContent.includes("Registro de Comunicaciones"));
assert(!!commsFlowLink, "Debe existir el Flow de Gobierno del Registro de Comunicaciones en el sidebar");
commsFlowLink.dispatchEvent(new window.Event("click", { bubbles: true }));
const commsTraceBtn = [...doc.querySelectorAll("button")].find((b) => b.textContent.includes("Ver trazabilidad"));
commsTraceBtn.dispatchEvent(new window.Event("click", { bubbles: true }));
assert(doc.querySelectorAll(".trace-branch").length === 7, `El Flow del Registro de Comunicaciones debe pintar 7 ramas, vi: ${doc.querySelectorAll(".trace-branch").length}`);
homeLink.dispatchEvent(new window.Event("click", { bubbles: true }));
const cmTableLink = [...doc.querySelectorAll(".side-link")].find((l) => l.textContent.trim() === "sgsi.communications_matrix_analysis");
assert(!!cmTableLink, "Debe existir el link de sidebar para la tabla sgsi.communications_matrix_analysis");
cmTableLink.dispatchEvent(new window.Event("click", { bubbles: true }));
const cmImpactBtn = [...doc.querySelectorAll("button")].find((b) => b.textContent.includes("Ver impacto"));
assert(!!cmImpactBtn, "Debe existir el botón 'Ver impacto' en la ficha de sgsi.communications_matrix_analysis");
cmImpactBtn.dispatchEvent(new window.Event("click", { bubbles: true }));
const cmImpactText = doc.getElementById("content").textContent;
assert(cmImpactText.includes("Registro de Comunicaciones"), "Impact de communications_matrix_analysis debe incluir la Operación de Gobierno");
assert(cmImpactText.includes("Publicar"), `Impact de communications_matrix_analysis debe cruzar hacia 'Publicar documento/entidad' de Doc-Flow, vi: ${cmImpactText.slice(0, 400)}`);

// 33. Gobierno: Impact Mode de FN-V2-POSITION-GET-BY-ID — impacto directo (FLOW-GOV-009)
// e indirecto vía callers internos (v2_position_get_by_customerid, v2_position_upsert)
homeLink.dispatchEvent(new window.Event("click", { bubbles: true }));
const posFnLink = [...doc.querySelectorAll(".side-link")].find((l) => l.textContent.trim() === "sgsi.v2_position_get_by_id");
assert(!!posFnLink, "Debe existir el link de sidebar para la function sgsi.v2_position_get_by_id");
posFnLink.dispatchEvent(new window.Event("click", { bubbles: true }));
const posFnImpactBtn = [...doc.querySelectorAll("button")].find((b) => b.textContent.includes("Ver impacto"));
assert(!!posFnImpactBtn, "Debe existir el botón 'Ver impacto' en la ficha de sgsi.v2_position_get_by_id");
posFnImpactBtn.dispatchEvent(new window.Event("click", { bubbles: true }));
const posFnImpactText = doc.getElementById("content").textContent;
assert(posFnImpactText.includes("Gestionar Cargos"), "Impact de v2_position_get_by_id debe incluir la Operación de Cargos");
assert(posFnImpactText.includes("v2_position_get_by_customerid") || posFnImpactText.includes("v2_position_upsert"), `Impact indirecto debe mostrar sus callers internos, vi: ${posFnImpactText.slice(0, 400)}`);

if (errors.length) {
  console.error("SMOKE TEST FAILED:\n" + errors.join("\n"));
  process.exit(1);
}
console.log("SMOKE TEST OK — la UI renderiza y las interacciones principales no arrojan errores.");
