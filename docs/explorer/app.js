// app.js
//
// UI del Traceability Explorer. NO conoce Activos: todo lo que renderiza sale de
// window.__EXPLORER_DATA__ (generado por parser.mjs a partir de docs/**). Este
// archivo no importa ni referencia docs/05-flows ni docs/06-technical directamente,
// y no contiene ningún ID de nodo escrito a mano (FLOW-ACT-*, EP-*, FN-*): todo se
// itera desde los arreglos nodes[]/edges[] de los datos.

(function () {
  "use strict";

  const DATA = window.__EXPLORER_DATA__;
  const nodesById = new Map(DATA.nodes.map((n) => [n.id, n]));

  // ------------------------------------------------------------------
  // Graph helpers (todo derivado, nada hardcodeado)
  // ------------------------------------------------------------------
  function node(id) {
    // Busca en nodos del grafo
    const graphNode = nodesById.get(id);
    if (graphNode) return graphNode;
    // Busca en componentes transversales por slug
    if (DATA.transversalComponents) {
      const comp = DATA.transversalComponents.find((c) => c.slug === id);
      if (comp) {
        return { id: comp.slug, type: "component", name: comp.name, ...comp };
      }
    }
    return undefined;
  }
  function nodesOfType(type) {
    return DATA.nodes.filter((n) => n.type === type);
  }
  function edgesFrom(id, relation) {
    return DATA.edges.filter((e) => e.source === id && (!relation || e.relation === relation));
  }
  function edgesTo(id, relation) {
    return DATA.edges.filter((e) => e.target === id && (!relation || e.relation === relation));
  }
  function flowsUsingEndpoint(endpointId) {
    return edgesTo(endpointId, "uses").map((e) => e.source);
  }
  function endpointsExecutingFunction(fnId) {
    return edgesTo(fnId, "executes").map((e) => e.source);
  }
  function callersOfFunction(fnId, seen = new Set()) {
    if (seen.has(fnId)) return seen;
    seen.add(fnId);
    for (const e of edgesTo(fnId, "calls")) callersOfFunction(e.source, seen);
    seen.delete(fnId);
    return seen;
  }
  function functionsTouchingTable(tableId) {
    return edgesTo(tableId).filter((e) => e.relation === "writes" || e.relation === "reads");
  }

  // "Used by flows" para endpoint/function, calculado (nunca almacenado en los YAML).
  function flowsUsingNode(id) {
    const n = node(id);
    if (n.type === "endpoint") return flowsUsingEndpoint(id);
    if (n.type === "function") {
      const eps = endpointsExecutingFunction(id);
      const direct = new Set(eps.flatMap((ep) => flowsUsingEndpoint(ep)));
      return [...direct];
    }
    return [];
  }

  // Impacto DIRECTO / INDIRECTO de una función (sección 15 del prompt).
  function functionImpact(fnId) {
    const directEndpoints = endpointsExecutingFunction(fnId);
    const directFlows = new Set(directEndpoints.flatMap((ep) => flowsUsingEndpoint(ep)));
    const callerFns = edgesTo(fnId, "calls").map((e) => e.source); // funciones que la llaman (indirecto)
    const indirectEndpoints = callerFns.flatMap((fn) => endpointsExecutingFunction(fn));
    const indirectFlows = new Set(indirectEndpoints.flatMap((ep) => flowsUsingEndpoint(ep)));
    return {
      direct: { endpoints: directEndpoints, flows: [...directFlows] },
      indirect: { functions: callerFns, endpoints: indirectEndpoints, flows: [...indirectFlows] },
    };
  }

  // Impacto de una tabla: funciones directas (escriben/leen) + indirectas (llaman a esas).
  function tableImpact(tableId) {
    const direct = functionsTouchingTable(tableId); // [{source: fnId, relation}]
    const directFnIds = direct.map((e) => e.source);
    const directEndpoints = new Set(directFnIds.flatMap((fn) => endpointsExecutingFunction(fn)));
    const directFlows = new Set([...directEndpoints].flatMap((ep) => flowsUsingEndpoint(ep)));

    const indirectFnIds = new Set();
    for (const fn of directFnIds) {
      for (const caller of edgesTo(fn, "calls").map((e) => e.source)) indirectFnIds.add(caller);
    }
    const indirectEndpoints = new Set([...indirectFnIds].flatMap((fn) => endpointsExecutingFunction(fn)));
    const indirectFlows = new Set([...indirectEndpoints].flatMap((ep) => flowsUsingEndpoint(ep)));

    return {
      direct: { functions: direct, endpoints: [...directEndpoints], flows: [...directFlows] },
      indirect: { functions: [...indirectFnIds], endpoints: [...indirectEndpoints], flows: [...indirectFlows] },
    };
  }

  // Puntos de convergencia: nodos usados/llamados por más de un nodo aguas arriba.
  function detectConvergences() {
    const rows = [];
    for (const ep of nodesOfType("endpoint")) {
      const flows = flowsUsingEndpoint(ep.id);
      if (flows.length > 1) rows.push({ type: "endpoint-shared", targetId: ep.id, upstream: flows });
    }
    for (const fn of nodesOfType("function")) {
      const callers = edgesTo(fn.id, "calls").map((e) => e.source);
      if (callers.length > 0) rows.push({ type: "function-called", targetId: fn.id, upstream: callers });
    }
    return rows;
  }

  // ------------------------------------------------------------------
  // Estado de navegación
  // ------------------------------------------------------------------
  const state = {
    view: "home", // home | node | trace | impact
    currentId: null,
    filter: "ALL",
    crumbs: [], // [{label, view, id}]
    collapsedMenuGroups: new Set(), // grupos de Operaciones colapsados en el sidebar (por nombre de grupo)
  };

  function go(view, id, opts = {}) {
    closeMobileSidebar();
    const label = id ? node(id).name : "SGSI";
    if (opts.reset || state.crumbs.length === 0) {
      state.crumbs = [{ label: "SGSI", view: "home", id: null }];
      if (id) state.crumbs.push({ label, view, id });
    } else if (opts.replaceTop) {
      state.crumbs[state.crumbs.length - 1] = { label, view, id };
    } else {
      state.crumbs.push({ label, view, id });
    }
    state.view = view;
    state.currentId = id;
    render();
  }

  // ------------------------------------------------------------------
  // Root DOM refs
  // ------------------------------------------------------------------
  const $sidebar = document.getElementById("sidebar");
  const $content = document.getElementById("content");
  const $detail = document.getElementById("detail");
  const $breadcrumbs = document.getElementById("breadcrumbs");
  const $searchInput = document.getElementById("search-input");
  const $searchResults = document.getElementById("search-results");
  const $filters = document.getElementById("filters");
  const $sidebarToggle = document.getElementById("sidebar-toggle");
  const $sidebarBackdrop = document.getElementById("sidebar-backdrop");
  const $themeToggle = document.getElementById("theme-toggle");

  // ------------------------------------------------------------------
  // Theme management (Dark / Light)
  // ------------------------------------------------------------------
  function getSavedTheme() {
    try {
      const saved = localStorage.getItem("explorer_theme");
      if (saved === "light" || saved === "dark") return saved;
    } catch {}
    return "dark"; // Default: pure black dark mode
  }

  function applyTheme(theme) {
    document.documentElement.setAttribute("data-theme", theme);
    if ($themeToggle) {
      const icon = $themeToggle.querySelector(".theme-toggle-icon") || $themeToggle;
      icon.textContent = theme === "light" ? "☀️" : "🌙";
      $themeToggle.setAttribute("title", theme === "light" ? "Cambiar a modo oscuro" : "Cambiar a modo claro");
    }
    try {
      localStorage.setItem("explorer_theme", theme);
    } catch {}
  }

  function toggleTheme() {
    const current = document.documentElement.getAttribute("data-theme") || "dark";
    applyTheme(current === "light" ? "dark" : "light");
  }

  if ($themeToggle) {
    $themeToggle.addEventListener("click", toggleTheme);
  }
  applyTheme(getSavedTheme());

  function closeMobileSidebar() {
    if ($sidebar) $sidebar.classList.remove("open");
    if ($sidebarBackdrop) $sidebarBackdrop.classList.add("hidden");
  }

  function toggleMobileSidebar() {
    if (!$sidebar) return;
    const willOpen = !$sidebar.classList.contains("open");
    $sidebar.classList.toggle("open", willOpen);
    if ($sidebarBackdrop) $sidebarBackdrop.classList.toggle("hidden", !willOpen);
  }

  if ($sidebarToggle) {
    $sidebarToggle.addEventListener("click", toggleMobileSidebar);
  }
  if ($sidebarBackdrop) {
    $sidebarBackdrop.addEventListener("click", closeMobileSidebar);
  }

  function el(tag, attrs = {}, children = []) {
    const node = document.createElement(tag);
    for (const [k, v] of Object.entries(attrs)) {
      if (k === "class") node.className = v;
      else if (k === "html") node.innerHTML = v;
      else if (k.startsWith("on")) node.addEventListener(k.slice(2), v);
      else node.setAttribute(k, v);
    }
    for (const c of [].concat(children)) {
      if (c == null) continue;
      node.appendChild(typeof c === "string" ? document.createTextNode(c) : c);
    }
    return node;
  }

  // Etiquetas de PRESENTACIÓN únicamente. El valor interno del tipo de nodo
  // (n.type, usado en filtros, edges y CSS classnames) sigue siendo "flow".
  const TYPE_LABELS = { flow: "Operación", endpoint: "Endpoint", function: "Function", table: "Table", external: "External" };
  function typeLabel(type) {
    return TYPE_LABELS[type] || type;
  }
  function typeBadge(type) {
    return el("span", { class: `type-badge type-${type}` }, [el("span", { class: "dot" }), typeLabel(type)]);
  }

  // Grupo de menú de una Operación: usa menuSection propio si el Flow lo declaró
  // (para separar, dentro de un mismo módulo, secciones reales del menú de app-sgsi
  // que agrupan distinto — ej. Riesgos: "Gestión de Riesgos" vs "Tratamiento de
  // Riesgos"); si no, cae al menuLabel/name del catálogo de su domain. Nunca hardcodea
  // el nombre de un módulo puntual: todo sale de docs/00-catalog/*.md y del front
  // matter de cada Flow.
  function toggleMenuGroup(group) {
    if (state.collapsedMenuGroups.has(group)) state.collapsedMenuGroups.delete(group);
    else state.collapsedMenuGroups.add(group);
    renderSidebar();
  }

  // Collapse / Expand ALL sidebar groups at once
  function collapseAllSidebar() {
    const flows = nodesOfType("flow").sort((a, b) => a.id.localeCompare(b.id));
    const allGroups = groupFlowsByMenuOrder(flows).map(([g]) => g);
    const techLabels = ["Endpoints", "Functions", "Tables"];
    const all = allGroups.concat(techLabels);
    const allCollapsed = all.every((g) => state.collapsedMenuGroups.has(g));
    if (allCollapsed) {
      state.collapsedMenuGroups.clear();
    } else {
      for (const g of all) state.collapsedMenuGroups.add(g);
    }
    renderSidebar();
  }

  function isAllCollapsed() {
    const flows = nodesOfType("flow").sort((a, b) => a.id.localeCompare(b.id));
    const allGroups = groupFlowsByMenuOrder(flows).map(([domain]) => domain);
    const techLabels = ["Endpoints", "Functions", "Tables"];
    return allGroups.concat(techLabels).every((g) => state.collapsedMenuGroups.has(g));
  }

  // ------------------------------------------------------------------
  // Markdown-lite renderer (inline code + bold only, XSS-safe)
  // ------------------------------------------------------------------
  function renderMarkdownSpan(text) {
    if (!text) return "";
    // Escape HTML entities first
    const safe = text.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
    // `code` → <code class="mono-code">
    const withCode = safe.replace(/`([^`]+)`/g, '<code class="mono-code">$1</code>');
    // bold: use RegExp constructor to avoid literal asterisk-slash in source (breaks validate.mjs comment strip)
    const boldRe = new RegExp("\\*\\*([^*]+)\\*\\*", "g");
    const withBold = withCode.replace(boldRe, "<strong>$1</strong>");
    return withBold;
  }

  // Get structured modules from DATA.modules or fallback to parsing catalogSummary
  function getCatalogModules() {
    if (DATA.modules && DATA.modules.length) return DATA.modules;
    // Fallback: parse catalogSummary string
    if (!DATA.catalogSummary) return [];
    return DATA.catalogSummary.split("\n\n").map((block) => {
      const colonIdx = block.indexOf(": ");
      const name = colonIdx > 0 ? block.slice(0, colonIdx) : "Módulo";
      const summary = colonIdx > 0 ? block.slice(colonIdx + 2) : block;
      // Try to find domain id from DATA.domains
      let domainId = null;
      if (DATA.domains) {
        for (const [id, d] of Object.entries(DATA.domains)) {
          if (d.name === name) { domainId = id; break; }
        }
      }
      return { id: domainId, name, menuLabel: name, summary };
    });
  }

  // Count flows belonging to a domain
  function countFlowsForDomain(domainId) {
    if (!domainId) return 0;
    return nodesOfType("flow").filter((f) => f.metadata.domain === domainId).length;
  }

  // Get flows belonging to a domain
  function getFlowsForDomain(domainId) {
    if (!domainId) return [];
    return nodesOfType("flow").filter((f) => f.metadata.domain === domainId).sort((a, b) => a.id.localeCompare(b.id));
  }

  // Render module detail in the right panel
  function renderModuleDetail(mod) {
    $detail.classList.remove("empty-panel");
    $detail.innerHTML = "";

    // Header
    const header = el("div", { class: "module-detail-header" }, [
      el("div", { class: "module-card-icon" }),
      el("h3", {}, mod.name),
    ]);
    $detail.appendChild(header);

    if (mod.id) {
      $detail.appendChild(el("div", { style: "margin-bottom:12px" }, [
        el("span", { class: "module-domain-badge" }, mod.id),
      ]));
    }

    // Summary with markdown
    const summaryDiv = el("div", { class: "module-detail-summary", html: renderMarkdownSpan(mod.summary) });
    $detail.appendChild(summaryDiv);

    // Flows for this domain
    const flows = getFlowsForDomain(mod.id);
    if (flows.length) {
      const section = el("div", { class: "detail-section" }, [
        el("h4", {}, `Operaciones (${flows.length})`),
      ]);
      const list = el("div", { class: "module-detail-flow-list" });
      for (const f of flows) {
        list.appendChild(
          el("div", { class: "module-detail-flow-item", onclick: () => go("node", f.id, { reset: true }) }, [
            el("span", { class: "dot" }),
            el("span", {}, f.name),
          ])
        );
      }
      section.appendChild(list);
      $detail.appendChild(section);
    }
  }
  // ------------------------------------------------------------------
  // Sidebar
  // ------------------------------------------------------------------
  function renderSidebar() {
    $sidebar.innerHTML = "";

    // Sidebar header with collapse-all button
    const sidebarHeader = el("div", { class: "sidebar-header" }, [
      el("span", { class: "sidebar-header-title" }, "Navegación"),
      el("button", {
        class: "sidebar-collapse-btn",
        onclick: (e) => { e.stopPropagation(); collapseAllSidebar(); },
      }, isAllCollapsed() ? "⊞ Expandir" : "⊟ Colapsar"),
    ]);
    $sidebar.appendChild(sidebarHeader);

    const home = el("div", { class: "side-link" + (state.view === "home" ? " active" : ""), onclick: () => go("home", null, { reset: true }) }, ["SGSI"]);
    $sidebar.appendChild(home);

    const f = state.filter; // "ALL" | "flow" | "endpoint" | "function" | "table"

    if (f === "ALL" || f === "flow") {
      const flows = nodesOfType("flow").sort((a, b) => a.id.localeCompare(b.id));
      const opsSection = el("div", { class: "side-section" });
      for (const [domain, groupData] of groupFlowsByMenuOrder(flows)) {
        const collapsed = state.collapsedMenuGroups.has(domain);
        opsSection.appendChild(
          el(
            "div",
            { class: "side-title side-group-toggle", onclick: () => toggleMenuGroup(domain) },
            [el("span", { class: "side-group-caret" }, collapsed ? "▸" : "▾"), " " + groupData.name]
          )
        );
        if (!collapsed) {
          for (const n of groupData.items) {
            opsSection.appendChild(
              el(
                "div",
                { class: "side-link" + (state.currentId === n.id ? " active" : ""), onclick: () => go("node", n.id, { reset: true }) },
                [el("span", { class: "dot", style: "background:var(--c-flow)" }), n.name]
              )
            );
          }
        }
      }
      $sidebar.appendChild(opsSection);
    }

    // ---- Transversal Components section in sidebar ----
    if ((f === "ALL" || f === "flow") && DATA.transversalComponents && DATA.transversalComponents.length) {
      const compSection = el("div", { class: "side-section" });
      const compTitle = el("div", { class: "side-title" }, "Componentes Transversales");
      compSection.appendChild(compTitle);
      for (const comp of DATA.transversalComponents) {
        compSection.appendChild(
          el(
            "div",
            { class: "side-link" + (state.currentId === comp.slug ? " active" : ""), onclick: () => go("node", comp.slug, { reset: true }) },
            [
              el("span", { class: "dot", style: "background:var(--c-flow)" }),
              el("span", { style: "flex:1" }, comp.name),
              el("span", { style: "font-size:11px;color:var(--text-dim);margin-left:4px" }, `${comp.endpoints}ep ${comp.functions}fn`),
            ]
          )
        );
      }
      $sidebar.appendChild(compSection);
    }

    const techTypes = [
      ["endpoint", "Endpoints"],
      ["function", "Functions"],
      ["table", "Tables"],
    ].filter(([type]) => f === "ALL" || f === type);

    if (techTypes.length) {
      const techSection = el("div", { class: "side-section" }, [el("div", { class: "side-title" }, "Técnico")]);
      for (const [type, label] of techTypes) {
        const collapsed = state.collapsedMenuGroups.has(label);
        const group = el("div", {}, [
          el(
            "div",
            { class: "side-title side-group-toggle", style: "margin-top:10px", onclick: () => toggleMenuGroup(label) },
            [el("span", { class: "side-group-caret" }, collapsed ? "▸" : "▾"), " " + label]
          ),
        ]);
        if (!collapsed) {
          for (const n of nodesOfType(type).sort((a, b) => a.name.localeCompare(b.name))) {
            group.appendChild(
              el(
                "div",
                { class: "side-link" + (state.currentId === n.id ? " active" : ""), onclick: () => go("node", n.id, { reset: true }) },
                [el("span", { class: "dot", style: `background:var(--c-${type})` }), n.name]
              )
            );
          }
        }
        techSection.appendChild(group);
      }
      $sidebar.appendChild(techSection);
    }
  }

  // ------------------------------------------------------------------
  // Menu ordering (match app-sgsi/src/data/menu.ts order)
  // Order by domain name to match system menu
  // ------------------------------------------------------------------
  const DOMAIN_MENU_ORDER = [
    "Bandeja de Entrada",    // inbox-sgsi (index 0)
    "Dashboard",             // dashboard (index 1)
    "Wizard",                // wizard (index 2)
    "Contexto y Alcance",    // context-scope (index 3)
    "Gobierno del SGSI",     // governance (index 4)
    "Partes interesadas",    // stakeholders (index 5)
    "Activos",               // assets (index 6)
    "Riesgos",               // risks (index 7)
    "Capacitaciones",        // training (index 8)
    "Iniciativas SGSI",      // initiatives (index 9)
    "Revisiones de Recursos",// resource-review (index 10)
    "Flujo Documental",      // doc-flow (index 11)
    "Controles y SoA",       // soa (index 12)
    "Tratamiento de Riesgos",// risk-treatment (index 13)
    "Eventos e Incidentes",  // security-events (index 14)
  ];

  function getMenuGroupOrder(domainName) {
    const idx = DOMAIN_MENU_ORDER.indexOf(domainName);
    return idx >= 0 ? idx : DOMAIN_MENU_ORDER.length;
  }

  function groupFlowsByMenuOrder(flows) {
    // Group by domain, then sort by menu order
    const grouped = new Map();
    for (const f of flows) {
      const domain = f.metadata.domain || "UNKNOWN";
      const domainName = DATA.domains[domain]?.name || domain;
      if (!grouped.has(domain)) {
        grouped.set(domain, { name: domainName, items: [] });
      }
      grouped.get(domain).items.push(f);
    }

    // Sort groups by menu order based on domain name
    const sorted = [...grouped.entries()].sort(
      ([, a], [, b]) => getMenuGroupOrder(a.name) - getMenuGroupOrder(b.name)
    );
    return sorted;
  }

  // ------------------------------------------------------------------
  // Breadcrumbs
  // ------------------------------------------------------------------
  function renderBreadcrumbs() {
    $breadcrumbs.innerHTML = "";
    state.crumbs.forEach((c, i) => {
      const isLast = i === state.crumbs.length - 1;
      $breadcrumbs.appendChild(
        el(
          "span",
          {
            class: "crumb" + (isLast ? " current" : ""),
            onclick: isLast
              ? null
              : () => {
                  state.crumbs = state.crumbs.slice(0, i + 1);
                  state.view = c.view;
                  state.currentId = c.id;
                  render();
                },
          },
          c.label
        )
      );
      if (!isLast) $breadcrumbs.appendChild(el("span", { class: "sep" }, "›"));
    });
  }

  // ------------------------------------------------------------------
  // Home
  // ------------------------------------------------------------------
  function renderHome() {
    $content.innerHTML = "";
    const moduleNames = Object.values(DATA.domains || {}).map((d) => d.name);
    $content.appendChild(el("div", { class: "page-title" }, "SGSI"));
    $content.appendChild(
      el(
        "div",
        { class: "page-subtitle" },
        moduleNames.length
          ? `Traceability Explorer — trazabilidad Frontend → API → Backend → Database. Módulos documentados: ${moduleNames.join(", ")}.`
          : "Traceability Explorer — trazabilidad Frontend → API → Backend → Database."
      )
    );

    const statGrid = el("div", { class: "stat-grid" });
    for (const [type, label] of [
      ["flow", "Operaciones"],
      ["endpoint", "Endpoints"],
      ["function", "Functions"],
      ["table", "Tables"],
    ]) {
      statGrid.appendChild(
        el("div", { class: "stat-card" }, [el("div", { class: "num" }, String(DATA.counts[type] || 0)), el("div", { class: "label" }, label)])
      );
    }
    $content.appendChild(statGrid);

    // ---- Module cards grid ----
    const catalogModules = getCatalogModules();
    if (catalogModules.length) {
      // State for module section
      let modulesSectionVisible = true;
      let moduleFilterText = "";

      const countChip = el("span", { class: "module-count-chip" }, `${catalogModules.length} módulos`);
      const toggleBtn = el("button", { class: "module-toggle-btn" }, "▾ Ocultar");
      const grid = el("div", { class: "module-grid" });

      function updateModuleCards() {
        grid.innerHTML = "";
        if (!modulesSectionVisible) {
          grid.style.display = "none";
          return;
        }
        grid.style.display = "grid";

        // Filter modules
        const filterNorm = moduleFilterText.trim().toLowerCase();
        const filtered = filterNorm
          ? catalogModules.filter((m) => m.name.toLowerCase().includes(filterNorm) || (m.id && m.id.toLowerCase().includes(filterNorm)))
          : catalogModules;

        countChip.textContent = filterNorm ? `${filtered.length} / ${catalogModules.length} módulos` : `${catalogModules.length} módulos`;

        if (filtered.length === 0) {
          grid.appendChild(
            el("div", { style: "grid-column: 1 / -1; color: var(--text-dim); padding: 14px 4px; font-size: 13px;" }, "No se encontraron módulos coincidentes.")
          );
          return;
        }

        for (const mod of filtered) {
          const opsCount = countFlowsForDomain(mod.id);
          const card = el("div", { class: "module-card", onclick: () => renderModuleDetail(mod) }, [
            el("div", { class: "module-card-header" }, [
              el("div", { class: "module-card-icon" }),
              el("div", { class: "module-card-name" }, mod.name),
              mod.id ? el("span", { class: "module-domain-badge" }, mod.id) : null,
              opsCount > 0 ? el("span", { class: "module-ops-badge" }, `${opsCount} ops`) : null,
            ]),
            el("div", { class: "module-card-body", html: renderMarkdownSpan(mod.summary) }),
            opsCount > 0 ? el("div", { class: "module-card-footer" }, [
              el("button", {
                class: "goto-btn",
                onclick: (e) => {
                  e.stopPropagation();
                  // Find the section-label for this domain's flows and scroll to it
                  const dom = DATA.domains && DATA.domains[mod.id];
                  const menuLabel = dom ? (dom.menuLabel || dom.name) : mod.name;
                  const labels = $content.querySelectorAll(".section-label");
                  for (const lbl of labels) {
                    if (lbl.textContent === menuLabel) {
                      lbl.scrollIntoView({ behavior: "smooth", block: "start" });
                      break;
                    }
                  }
                },
              }, "Ver operaciones ↓"),
            ]) : null,
          ]);
          grid.appendChild(card);
        }
      }

      const filterInput = el("input", {
        class: "module-filter-input",
        type: "text",
        placeholder: "Filtrar módulos…",
        oninput: (e) => {
          moduleFilterText = e.target.value;
          if (!modulesSectionVisible && moduleFilterText) {
            modulesSectionVisible = true;
            toggleBtn.textContent = "▾ Ocultar";
          }
          updateModuleCards();
        },
      });

      toggleBtn.onclick = () => {
        modulesSectionVisible = !modulesSectionVisible;
        toggleBtn.textContent = modulesSectionVisible ? "▾ Ocultar" : "▸ Mostrar";
        updateModuleCards();
      };

      const headerDiv = el("div", { class: "module-section-header" }, [
        el("div", { style: "display:flex;align-items:center;gap:10px" }, [
          el("div", { class: "section-label" }, "Módulos del SGSI"),
          countChip,
        ]),
        el("div", { class: "module-header-actions" }, [
          filterInput,
          toggleBtn,
        ]),
      ]);

      $content.appendChild(headerDiv);
      $content.appendChild(grid);
      updateModuleCards();
    }

    // ---- Transversal Components ----
    if (DATA.transversalComponents && DATA.transversalComponents.length) {
      const headerDiv = el("div", { class: "module-section-header" }, [
        el("div", { style: "display:flex;align-items:center;gap:10px" }, [
          el("div", { class: "section-label" }, "Componentes Transversales"),
          el("span", { class: "module-count-chip" }, `${DATA.transversalComponents.length} componentes`),
        ]),
      ]);
      $content.appendChild(headerDiv);

      const componentGrid = el("div", { class: "module-grid" });
      for (const comp of DATA.transversalComponents) {
        const badge = el("span", { class: "component-badge" }, comp.classification);
        const card = el("div", { class: "module-card component-card" }, [
          el("div", { class: "module-card-header" }, [
            el("div", { class: "module-card-icon" }),
            el("div", { class: "module-card-name" }, comp.name),
          ]),
          el("div", { class: "module-card-body" }, [
            badge,
            el("div", { style: "margin-top:8px; font-size:12px; color:var(--text-dim)" }, [
              el("div", {}, `Endpoints: ${comp.endpoints} • Functions: ${comp.functions}`),
            ]),
            comp.summary ? el("div", { style: "margin-top:8px", html: renderMarkdownSpan(comp.summary) }) : null,
          ]),
        ]);
        componentGrid.appendChild(card);
      }
      $content.appendChild(componentGrid);
    }

    const sortedFlows = nodesOfType("flow").sort((a, b) => a.id.localeCompare(b.id));
    for (const [, groupData] of groupFlowsByMenuOrder(sortedFlows)) {
      $content.appendChild(el("div", { class: "section-label" }, groupData.name));
      const grid = el("div", { class: "flow-grid" });
      for (const f of groupData.items) {
        grid.appendChild(
          el(
            "div",
            { class: "flow-tile", onclick: () => go("node", f.id, { reset: true }) },
            [
              el("div", { class: "fid" }, f.id),
              el("div", { class: "fname" }, f.name),
              el("div", { class: "fmeta" }, f.metadata.clientSideOnly ? el("span", { class: "type-badge type-external" }, "Client-side") : typeBadge("flow")),
            ]
          )
        );
      }
      $content.appendChild(grid);
    }

    const conv = detectConvergences();
    if (conv.length) {
      $content.appendChild(el("div", { class: "section-label" }, "Puntos de convergencia detectados"));
      const list = el("div", { class: "convergence-list" });
      for (const c of conv) {
        const t = node(c.targetId);
        const upstreamNames = c.upstream.map((id) => node(id).name).join(", ");
        list.appendChild(
          el(
            "div",
            { class: "convergence-row", onclick: () => go("node", c.targetId, { reset: true }) },
            [typeBadge(t.type), el("span", {}, t.name), el("span", { class: "arrow" }, "←"), el("span", { style: "color:var(--text-dim)" }, upstreamNames)]
          )
        );
      }
      $content.appendChild(list);
    }

    $detail.classList.add("empty-panel");
    $detail.innerHTML = '<div class="empty">Selecciona una Operación o un elemento técnico para ver su detalle aquí.</div>';
  }

  // ------------------------------------------------------------------
  // Flow view
  // ------------------------------------------------------------------
  function flowEndpointRefs(flowId) {
    // Devuelve [{ref, action}] a partir de las aristas "uses" (no del front matter directo,
    // para no depender de si era technical.endpoint o technical.endpoints[]).
    return edgesFrom(flowId, "uses").map((e) => ({ ref: e.target, action: e.label || null }));
  }

  function renderFlowNode(f) {
    const extra = DATA.flows[f.id] || {};
    const sections = extra.sections || {};
    $content.innerHTML = "";

    $content.appendChild(el("div", { class: "page-title" }, f.name));
    $content.appendChild(el("div", { class: "page-subtitle" }, `Operación · ${f.id}`));
    if (f.metadata.clientSideOnly) {
      $content.appendChild(el("div", { class: "client-side-badge" }, "Client side only"));
    }
    if (f.metadata.entryPoint) {
      $content.appendChild(el("div", { class: "page-subtitle" }, f.metadata.entryPoint));
    }

    if (sections["Propósito"]) {
      $content.appendChild(el("div", { class: "section-label" }, "Propósito"));
      $content.appendChild(el("div", { class: "card" }, [el("p", { class: "prose" }, sections["Propósito"])]));
    }

    // Frontend
    const fe = f.metadata.frontend;
    if (fe) {
      $content.appendChild(el("div", { class: "section-label" }, "Frontend"));
      const dl = el("dl", { class: "kv-grid" });
      if (fe.route) dl.append(el("dt", {}, "Route"), el("dd", { class: "mono" }, fe.route));
      if (fe.pages) dl.append(el("dt", {}, "Pages"), el("dd", {}, el("div", { class: "pill-list" }, fe.pages.map((p) => el("span", { class: "pill" }, p)))));
      if (fe.components)
        dl.append(el("dt", {}, "Components"), el("dd", {}, el("div", { class: "pill-list" }, fe.components.map((p) => el("span", { class: "pill" }, p.split("/").pop())))));
      if (fe.stores) dl.append(el("dt", {}, "Store"), el("dd", {}, el("div", { class: "pill-list" }, fe.stores.map((p) => el("span", { class: "pill" }, p.split("/").pop())))));
      if (fe.services) dl.append(el("dt", {}, "Service"), el("dd", {}, el("div", { class: "pill-list" }, fe.services.map((p) => el("span", { class: "pill" }, p.split("/").pop())))));
      $content.appendChild(el("div", { class: "card" }, [dl]));
    }

    // API / Database — derivado del grafo (uses -> executes)
    if (!f.metadata.clientSideOnly) {
      const refs = flowEndpointRefs(f.id);
      $content.appendChild(el("div", { class: "section-label" }, "API"));
      const apiCard = el("div", { class: "card" });
      for (const r of refs) {
        const ep = node(r.ref);
        apiCard.appendChild(
          el("div", { style: "margin-bottom:8px; cursor:pointer", onclick: () => go("node", ep.id) }, [
            r.action ? el("span", { style: "color:var(--text-faint); font-size:11px; margin-right:8px" }, r.action.toUpperCase()) : null,
            el("span", { class: "pill clickable" }, `${ep.metadata.method} ${ep.metadata.path}`),
          ])
        );
      }
      $content.appendChild(apiCard);

      $content.appendChild(el("div", { class: "section-label" }, "Database"));
      const dbCard = el("div", { class: "card" });
      const fnIds = new Set(refs.flatMap((r) => edgesFrom(r.ref, "executes").map((e) => e.target)));
      for (const fnId of fnIds) {
        const fn = node(fnId);
        dbCard.appendChild(el("div", { class: "pill clickable", style: "margin:4px 6px 4px 0; display:inline-block", onclick: () => go("node", fn.id) }, fn.name));
      }
      $content.appendChild(dbCard);
    } else {
      $content.appendChild(el("div", { class: "section-label" }, "Database"));
      $content.appendChild(el("div", { class: "card" }, [el("p", { class: "prose" }, "No aplica — esta Operación es completamente client-side (ver sección Frontend).")]));
    }

    // External dependencies
    const deps = edgesFrom(f.id, "depends_on");
    if (deps.length) {
      $content.appendChild(el("div", { class: "section-label" }, "Dependencias externas"));
      const depCard = el("div", { class: "card" });
      for (const d of deps) {
        const ext = node(d.target);
        depCard.appendChild(
          el("div", { class: "external-dep-row" }, [typeBadge("external"), el("div", {}, [el("div", { style: "font-weight:600" }, ext.name), el("div", { style: "color:var(--text-dim); font-size:12px; margin-top:2px" }, d.reason)])])
        );
      }
      $content.appendChild(depCard);
    }

    for (const title of ["Reglas relevantes", "Consideraciones"]) {
      if (sections[title]) {
        $content.appendChild(el("div", { class: "section-label" }, title));
        $content.appendChild(el("div", { class: "card" }, [el("p", { class: "prose" }, sections[title])]));
      }
    }

    if (!f.metadata.clientSideOnly) {
      const toolbar = el("div", { class: "diagram-toolbar" }, [
        el("button", { class: "btn primary", onclick: () => go("trace", f.id) }, "Ver trazabilidad"),
      ]);
      $content.appendChild(toolbar);
    }

    renderNodeDetailPanel(f);
  }

  // ------------------------------------------------------------------
  // Endpoint / Function / Table / External detail
  // ------------------------------------------------------------------
  function renderTechNode(n) {
    $content.innerHTML = "";
    $content.appendChild(el("div", { class: "page-title" }, n.name));
    $content.appendChild(el("div", { class: "page-subtitle" }, [typeBadge(n.type), " ", n.id]));

    if (n.type === "endpoint") {
      const dl = el("dl", { class: "kv-grid" });
      dl.append(
        el("dt", {}, "Method"), el("dd", { class: "mono" }, n.metadata.method),
        el("dt", {}, "Path"), el("dd", { class: "mono" }, n.metadata.path),
        el("dt", {}, "Access"), el("dd", {}, n.metadata.access || "—"),
        el("dt", {}, "Router"), el("dd", { class: "mono" }, n.metadata.router || "—"),
        el("dt", {}, "Controller"), el("dd", { class: "mono" }, n.metadata.controller || "—"),
        el("dt", {}, "Model"), el("dd", { class: "mono" }, n.metadata.model || "—")
      );
      $content.appendChild(el("div", { class: "card" }, [dl]));

      const fnEdges = edgesFrom(n.id, "executes");
      $content.appendChild(el("div", { class: "section-label" }, "Executes"));
      $content.appendChild(el("div", { class: "card" }, fnEdges.map((e) => el("span", { class: "pill clickable", style: "margin-right:6px", onclick: () => go("node", e.target) }, node(e.target).name))));

      if (n.metadata.notes) {
        $content.appendChild(el("div", { class: "section-label" }, "Notas"));
        $content.appendChild(el("div", { class: "card" }, [el("p", { class: "prose" }, n.metadata.notes)]));
      }
    }

    if (n.type === "function") {
      const dl = el("dl", { class: "kv-grid" });
      dl.append(el("dt", {}, "Name"), el("dd", { class: "mono" }, n.name), el("dt", {}, "Defined in"), el("dd", { class: "mono" }, n.metadata.definedIn || "—"));
      $content.appendChild(el("div", { class: "card" }, [dl]));

      $content.appendChild(el("div", { class: "section-label" }, "Table access"));
      const tblCard = el("div", { class: "card pill-list" });
      for (const e of edgesFrom(n.id).filter((e) => e.relation === "writes" || e.relation === "reads")) {
        const t = node(e.target);
        tblCard.appendChild(el("span", { class: `pill clickable ${e.relation === "writes" ? "write" : "read"}`, onclick: () => go("node", t.id) }, `${e.relation === "writes" ? "WRITE" : "READ"}  ${t.name}`));
      }
      $content.appendChild(tblCard);

      const calls = edgesFrom(n.id, "calls");
      if (calls.length) {
        $content.appendChild(el("div", { class: "section-label" }, "Calls"));
        $content.appendChild(el("div", { class: "card pill-list" }, calls.map((e) => el("span", { class: "pill clickable", onclick: () => go("node", e.target) }, node(e.target).name))));
      }
      const calledBy = edgesTo(n.id, "calls");
      if (calledBy.length) {
        $content.appendChild(el("div", { class: "section-label" }, "Called by"));
        $content.appendChild(el("div", { class: "card pill-list" }, calledBy.map((e) => el("span", { class: "pill clickable", onclick: () => go("node", e.source) }, node(e.source).name))));
      }

      if (n.metadata.notes) {
        $content.appendChild(el("div", { class: "section-label" }, "Notas"));
        $content.appendChild(el("div", { class: "card" }, [el("p", { class: "prose" }, n.metadata.notes)]));
      }

      const toolbar = el("div", { class: "diagram-toolbar" }, [el("button", { class: "btn primary", onclick: () => go("impact", n.id) }, "Ver impacto")]);
      $content.appendChild(toolbar);
    }

    if (n.type === "table") {
      const reads = edgesTo(n.id, "reads");
      const writes = edgesTo(n.id, "writes");
      $content.appendChild(el("div", { class: "section-label" }, "Written by"));
      $content.appendChild(el("div", { class: "card pill-list" }, writes.length ? writes.map((e) => el("span", { class: "pill clickable write", onclick: () => go("node", e.source) }, node(e.source).name)) : [el("span", { style: "color:var(--text-faint)" }, "—")]));
      $content.appendChild(el("div", { class: "section-label" }, "Read by"));
      $content.appendChild(el("div", { class: "card pill-list" }, reads.length ? reads.map((e) => el("span", { class: "pill clickable read", onclick: () => go("node", e.source) }, node(e.source).name)) : [el("span", { style: "color:var(--text-faint)" }, "—")]));

      const toolbar = el("div", { class: "diagram-toolbar" }, [el("button", { class: "btn primary", onclick: () => go("impact", n.id) }, "Ver impacto")]);
      $content.appendChild(toolbar);
    }

    if (n.type === "external") {
      $content.appendChild(el("div", { class: "section-label" }, "External dependency"));
      const card = el("div", { class: "card" });
      card.appendChild(el("p", { class: "prose" }, "Dependencia externa confirmada. No se expande — pertenece a otro módulo, no documentado en este piloto."));
      for (const r of n.metadata.reasons || []) {
        const flowNode = node(r.flow);
        card.appendChild(
          el("div", { style: "margin-top:10px; padding-top:10px; border-top:1px solid var(--border-soft)" }, [
            el("span", { class: "pill clickable", onclick: () => go("node", r.flow) }, flowNode ? flowNode.name : r.flow),
            el("p", { class: "prose", style: "margin-top:6px" }, r.reason),
          ])
        );
      }
      $content.appendChild(card);
    }

    renderNodeDetailPanel(n);
  }

  // ------------------------------------------------------------------
  // Transversal Component ficha
  // ------------------------------------------------------------------
  function renderTransversalNode(comp) {
    $content.innerHTML = "";
    $content.appendChild(el("div", { class: "page-title" }, comp.name));
    $content.appendChild(el("div", { class: "page-subtitle" }, [el("span", { class: "type-badge" }, "COMPONENTE TRANSVERSAL"), " ", comp.slug]));

    const dl = el("dl", { class: "kv-grid" });
    if (comp.classification) dl.append(el("dt", {}, "Clasificación"), el("dd", {}, comp.classification));
    if (comp.route) dl.append(el("dt", {}, "Ruta"), el("dd", { class: "mono" }, comp.route));
    if (comp.status) dl.append(el("dt", {}, "Status"), el("dd", {}, comp.status));
    $content.appendChild(el("div", { class: "card" }, [dl]));

    if (comp.summary) {
      $content.appendChild(el("div", { class: "section-label" }, "Resumen"));
      $content.appendChild(el("div", { class: "card" }, [el("p", { class: "prose" }, comp.summary)]));
    }

    if (comp.endpoints > 0 || comp.functions > 0) {
      $content.appendChild(el("div", { class: "section-label" }, "Técnico"));
      const techCard = el("div", { class: "card pill-list" });

      if (comp.endpoints > 0) {
        // Find endpoints by matching slug pattern in sourceFile path
        const slugPattern = comp.slug.split("-").join(""); // "dashboard-sgsi" -> "dashboardsgsi"
        const compEndpoints = DATA.nodes.filter((n) => {
          if (n.type !== "endpoint" || !n.metadata || !n.metadata.sourceFile) return false;
          // Check if sourceFile contains the slug (case-insensitive)
          return n.metadata.sourceFile.toLowerCase().includes(comp.slug.split("-")[0]);
        });
        if (compEndpoints.length > 0) {
          for (const ep of compEndpoints) {
            techCard.appendChild(el("span", { class: "pill clickable", style: "margin-right:6px; margin-bottom:6px", onclick: () => go("node", ep.id) }, `${ep.metadata.method} ${ep.metadata.path}`));
          }
        } else {
          techCard.appendChild(el("span", {}, `${comp.endpoints} Endpoints`));
        }
      }

      if (comp.functions > 0) {
        // Find functions by matching slug pattern
        const compFunctions = DATA.nodes.filter((n) => {
          if (n.type !== "function" || !n.metadata || !n.metadata.sourceFile) return false;
          return n.metadata.sourceFile.toLowerCase().includes(comp.slug.split("-")[0]);
        });
        if (compFunctions.length > 0) {
          for (const fn of compFunctions) {
            techCard.appendChild(el("span", { class: "pill clickable", style: "margin-right:6px; margin-bottom:6px", onclick: () => go("node", fn.id) }, fn.name));
          }
        } else {
          techCard.appendChild(el("span", {}, `${comp.functions} Functions`));
        }
      }

      $content.appendChild(techCard);
    }

    if (comp.convergences && comp.convergences.length > 0) {
      $content.appendChild(el("div", { class: "section-label" }, "Convergencias"));
      const convCard = el("div", { class: "card pill-list" });
      for (const domainSlug of comp.convergences) {
        const domainData = DATA.domains ? DATA.domains[domainSlug] : null;
        const displayName = domainData ? domainData.name : domainSlug;
        // Make convergences clickable: go to first flow of that domain if available
        const domainFlows = DATA.nodes.filter((n) => n.type === "flow" && n.metadata && n.metadata.domain === domainSlug);
        const clickHandler = domainFlows.length > 0 ? () => go("node", domainFlows[0].id) : null;
        convCard.appendChild(
          el(
            "span",
            { class: "pill" + (clickHandler ? " clickable" : ""), style: "margin-right:4px; margin-bottom:4px", onclick: clickHandler },
            displayName
          )
        );
      }
      $content.appendChild(convCard);
    }

    if (comp.sourceFile) {
      $content.appendChild(el("div", { class: "section-label", style: "margin-top:20px; opacity:0.7; font-size:11px" }, "Fuente"));
      $content.appendChild(el("div", { class: "card", style: "opacity:0.6; font-size:11px" }, [el("code", {}, comp.sourceFile)]));
    }

    renderNodeDetailPanel(comp);
  }

  // ------------------------------------------------------------------
  // Right detail panel (contextual: "used by flows", direct/indirect)
  // ------------------------------------------------------------------
  function renderNodeDetailPanel(n) {
    $detail.classList.remove("empty-panel");
    $detail.innerHTML = "";
    $detail.appendChild(el("h3", {}, [typeBadge(n.type), " ", n.name]));

    if (n.type === "flow") {
      const refs = flowEndpointRefs(n.id);
      const sec = el("div", { class: "detail-section" }, [el("h4", {}, "Endpoint(s)")]);
      refs.forEach((r) => sec.appendChild(el("div", { class: "used-by-item", onclick: () => go("node", r.ref) }, node(r.ref).name)));
      if (refs.length) $detail.appendChild(sec);
      return;
    }

    if (n.type === "endpoint" || n.type === "function") {
      const flows = flowsUsingNode(n.id);
      const sec = el("div", { class: "detail-section" }, [el("h4", {}, "Usado por Operaciones")]);
      if (flows.length === 0) sec.appendChild(el("div", { class: "empty" }, "Ninguno detectado"));
      flows.forEach((fid) => sec.appendChild(el("div", { class: "used-by-item", onclick: () => go("node", fid) }, node(fid).name)));
      $detail.appendChild(sec);
    }

    if (n.type === "table") {
      const impact = tableImpact(n.id);
      const sec = el("div", { class: "detail-section" }, [el("h4", {}, "Operaciones afectadas")]);
      const allFlows = new Set([...impact.direct.flows, ...impact.indirect.flows]);
      if (allFlows.size === 0) sec.appendChild(el("div", { class: "empty" }, "Ninguno detectado"));
      allFlows.forEach((fid) => sec.appendChild(el("div", { class: "used-by-item", onclick: () => go("node", fid) }, node(fid).name)));
      $detail.appendChild(sec);
    }
  }

  // ------------------------------------------------------------------
  // Trace mode — solo el Flow seleccionado, top-down, construido del grafo.
  // ------------------------------------------------------------------
  function renderTrace(flowId) {
    const f = node(flowId);
    $content.innerHTML = "";
    $content.appendChild(el("div", { class: "page-title" }, `Trazabilidad · ${f.name}`));
    $content.appendChild(el("div", { class: "diagram-toolbar" }, [el("button", { class: "btn", onclick: () => go("node", flowId, { replaceTop: true }) }, "← Volver a la ficha")]));

    const wrap = el("div", { class: "trace-wrap" });
    wrap.appendChild(traceNode(f));

    const refs = flowEndpointRefs(flowId);
    const deps = edgesFrom(flowId, "depends_on");

    if (refs.length) {
      wrap.appendChild(arrow("uses"));
      const branches = el("div", { class: "trace-branches" });
      for (const r of refs) {
        const branch = el("div", { class: "trace-branch" });
        if (r.action) branch.appendChild(el("div", { class: "trace-branch-label" }, r.action));
        branch.appendChild(buildFunctionChain(r.ref));
        branches.appendChild(branch);
      }
      wrap.appendChild(branches);
    }

    if (deps.length) {
      const depRow = el("div", { style: "margin-top:26px; display:flex; gap:12px; flex-wrap:wrap; justify-content:center" });
      for (const d of deps) depRow.appendChild(traceNode(node(d.target)));
      wrap.appendChild(el("div", { class: "trace-branch-label", style: "margin-top:20px" }, "depends_on (externo)"));
      wrap.appendChild(depRow);
    }

    $content.appendChild(wrap);
    renderNodeDetailPanel(f);
  }

  function buildFunctionChain(endpointId) {
    const col = el("div", { style: "display:flex; flex-direction:column; align-items:center" });
    col.appendChild(traceNode(node(endpointId)));
    const fnEdges = edgesFrom(endpointId, "executes");
    if (fnEdges.length) {
      col.appendChild(arrow("executes"));
      const row = el("div", { class: "trace-row" });
      for (const e of fnEdges) row.appendChild(buildFunctionSubtree(e.target));
      col.appendChild(row);
    }
    return col;
  }

  function buildFunctionSubtree(fnId, seen = new Set()) {
    const block = el("div", { class: "trace-fn-block" });
    block.appendChild(traceNode(node(fnId)));
    if (seen.has(fnId)) return block; // evita ciclos infinitos, no aplica en este dataset
    seen.add(fnId);

    const tableEdges = edgesFrom(fnId).filter((e) => e.relation === "writes" || e.relation === "reads");
    const callEdges = edgesFrom(fnId, "calls");

    if (tableEdges.length) {
      block.appendChild(arrow(tableEdges.some((e) => e.relation === "writes") ? "writes" : "reads"));
      const row = el("div", { class: "trace-row" });
      for (const e of tableEdges) row.appendChild(traceNode(node(e.target)));
      block.appendChild(row);
    }
    if (callEdges.length) {
      block.appendChild(arrow("calls"));
      const row = el("div", { class: "trace-row" });
      for (const e of callEdges) row.appendChild(buildFunctionSubtree(e.target, seen));
      block.appendChild(row);
    }
    return block;
  }

  function traceNode(n) {
    return el("div", { class: `trace-node tn-${n.type}`, onclick: () => go("node", n.id) }, [el("div", { class: "tn-type" }, typeLabel(n.type)), el("div", { class: "tn-name" }, n.name)]);
  }
  function arrow(label) {
    return el("div", { class: "trace-arrow" }, [el("div", { class: "line" }), el("div", { class: "relation-label" }, label)]);
  }

  // ------------------------------------------------------------------
  // Impact mode
  // ------------------------------------------------------------------
  function renderImpact(id) {
    const n = node(id);
    const impact = n.type === "table" ? tableImpact(id) : functionImpact(id);
    $content.innerHTML = "";
    $content.appendChild(el("div", { class: "page-title" }, `Impacto · ${n.name}`));
    $content.appendChild(el("div", { class: "diagram-toolbar" }, [el("button", { class: "btn", onclick: () => go("node", id, { replaceTop: true }) }, "← Volver a la ficha")]));

    const grid = el("div", { class: "impact-grid" });

    const directCol = el("div", { class: "impact-col direct" }, [el("h4", {}, "Direct impact")]);
    const directFlowIds = impact.direct.flows;
    if (directFlowIds.length === 0) directCol.appendChild(el("div", { class: "empty" }, "Ninguno"));
    for (const fid of directFlowIds) directCol.appendChild(el("div", { class: "impact-item", onclick: () => go("node", fid) }, [typeBadge("flow"), " ", node(fid).name]));
    for (const epId of impact.direct.endpoints || []) directCol.appendChild(el("div", { class: "impact-item", onclick: () => go("node", epId) }, [typeBadge("endpoint"), " ", node(epId).name]));

    const indirectCol = el("div", { class: "impact-col indirect" }, [el("h4", {}, "Indirect impact")]);
    const indirectFlowIds = impact.indirect.flows.filter((f) => !directFlowIds.includes(f));
    if ((impact.indirect.functions || []).length === 0 && indirectFlowIds.length === 0) indirectCol.appendChild(el("div", { class: "empty" }, "Ninguno"));
    for (const fnId of impact.indirect.functions || []) indirectCol.appendChild(el("div", { class: "impact-item", onclick: () => go("node", fnId) }, [typeBadge("function"), " ", node(fnId).name]));
    for (const epId of impact.indirect.endpoints || []) indirectCol.appendChild(el("div", { class: "impact-item", onclick: () => go("node", epId) }, [typeBadge("endpoint"), " ", node(epId).name]));
    for (const fid of indirectFlowIds) indirectCol.appendChild(el("div", { class: "impact-item", onclick: () => go("node", fid) }, [typeBadge("flow"), " ", node(fid).name]));

    grid.append(directCol, indirectCol);
    $content.appendChild(grid);
    renderNodeDetailPanel(n);
  }

  // ------------------------------------------------------------------
  // Search
  // ------------------------------------------------------------------
  function buildSearchIndex() {
    const rows = [];
    for (const n of DATA.nodes) {
      rows.push({ id: n.id, type: n.type, label: n.name, sub: n.id, haystack: `${n.id} ${n.name}`.toLowerCase() });
      if (n.type === "endpoint") rows[rows.length - 1].haystack += ` ${n.metadata.method} ${n.metadata.path}`.toLowerCase();
    }
    for (const [flowId, extra] of Object.entries(DATA.flows)) {
      const fe = extra.frontMatter && extra.frontMatter.frontend;
      if (fe && fe.components) {
        for (const c of fe.components) {
          const short = c.split("/").pop();
          rows.push({ id: flowId, type: "flow", label: short, sub: node(flowId).name, haystack: `${c} ${short}`.toLowerCase() });
        }
      }
      if (fe && fe.route) rows.push({ id: flowId, type: "flow", label: fe.route, sub: node(flowId).name, haystack: fe.route.toLowerCase() });
    }
    return rows;
  }
  const searchIndex = buildSearchIndex();

  const normSearch = (s) => s.toLowerCase().replace(/[^a-z0-9]/g, "");
  function runSearch(q) {
    const term = normSearch(q);
    if (!term) return [];
    return searchIndex.filter((r) => normSearch(r.haystack).includes(term)).slice(0, 20);
  }

  $searchInput.addEventListener("input", () => {
    const results = runSearch($searchInput.value);
    $searchResults.innerHTML = "";
    if (!results.length) {
      $searchResults.classList.add("hidden");
      return;
    }
    for (const r of results) {
      $searchResults.appendChild(
        el("div", { class: "search-row", onclick: () => { $searchResults.classList.add("hidden"); $searchInput.value = ""; go("node", r.id, { reset: true }); } }, [
          typeBadge(r.type),
          el("span", { class: "label" }, r.label),
          el("span", { class: "sub" }, r.sub),
        ])
      );
    }
    $searchResults.classList.remove("hidden");
  });
  document.addEventListener("click", (e) => {
    if (!e.target.closest(".search-wrap")) $searchResults.classList.add("hidden");
  });

  // ------------------------------------------------------------------
  // Filters (aplican a la sidebar: ocultan secciones que no matchean)
  // ------------------------------------------------------------------
  $filters.addEventListener("click", (e) => {
    const btn = e.target.closest(".filter-chip");
    if (!btn) return;
    state.filter = btn.dataset.filter;
    [...$filters.children].forEach((c) => c.classList.toggle("active", c === btn));
    renderSidebar();
  });

  // ------------------------------------------------------------------
  // Main render dispatcher
  // ------------------------------------------------------------------
  function render() {
    renderSidebar();
    renderBreadcrumbs();
    if (state.view === "home") renderHome();
    else if (state.view === "node") {
      const n = node(state.currentId);
      if (n.type === "flow") renderFlowNode(n);
      else if (n.type === "component") renderTransversalNode(n);
      else renderTechNode(n);
    } else if (state.view === "trace") renderTrace(state.currentId);
    else if (state.view === "impact") renderImpact(state.currentId);
  }

  go("home", null, { reset: true });
})();
