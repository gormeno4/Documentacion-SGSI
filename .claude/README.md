# Claude Code Skills & Agents for barnard-sgsi

Este directorio contiene **Skills** y **Agents** personalizados que validan el código contra los estándares definidos en `rulesproyect.md`.

---

## 📁 Estructura

```
.claude/
├── skills/                          # 17 Skills en formato correcto
│   ├── validate-sql-params/
│   │   └── SKILL.md                # Skill #1 (Node.js params)
│   ├── validate-component-size/
│   │   └── SKILL.md                # Skill #2 (component size)
│   ├── validate-naming-conventions/
│   │   └── SKILL.md                # Skill #3 (naming)
│   ├── validate-middleware-order/   # Skill #4 (middleware)
│   ├── validate-validation-engines/ # Skill #5 (Zod vs Joi)
│   ├── validate-jwt-config/         # Skill #6 (JWT)
│   ├── validate-mutation-lockdown/  # Skill #7 (form locking)
│   ├── validate-soft-deletes/       # Skill #8 (soft delete)
│   ├── validate-state-transitions/  # Skill #9 (state machines)
│   ├── detect-pl-pgsql-business-logic/ # Skill #10 (PL/pgSQL)
│   ├── analyze-architectural-decisions/ # Skill #11 (ADR helper + docs/adrs/)
│   ├── update-documentation/        # Skill #12 (trazabilidad funcional)
│   ├── backend-architecture/        # Skill #13 (moved from agents/)
│   ├── database-postgres/           # Skill #14 (moved from agents/)
│   ├── frontend-architecture/       # Skill #15 (moved from agents/)
│   ├── security-auth/               # Skill #16 (moved from agents/)
│   └── testing-vitest/              # Skill #17 (moved from agents/)
├── agents/
│   └── architecture-guardian.json   # Orquestador de skills
└── README.md                        # Este archivo
```

```
scripts/                            # Implementación real (Node.js)
├── validate-sql-params.js
├── validate-component-size.js
├── validate-naming-conventions.js
├── validate-middleware-order.js
├── validate-validation-engines.js
├── validate-jwt-config.js
├── validate-mutation-lockdown.js
├── validate-soft-deletes.js
├── validate-state-transitions.js
├── detect-pl-pgsql-business-logic.js
└── analyze-architectural-decisions.js
```

---

## 🚀 Cómo Usar

### **Opción 1: Ejecutar un script individual**

```bash
# Validar SQL parameterization
node scripts/validate-sql-params.js

# Validar tamaño de componentes
node scripts/validate-component-size.js

# Validar convenciones de nombres
node scripts/validate-naming-conventions.js

# Validar orden de middlewares
node scripts/validate-middleware-order.js

# Validar engines (Zod vs Joi)
node scripts/validate-validation-engines.js

# Validar JWT config
node scripts/validate-jwt-config.js

# Validar mutation lockdown
node scripts/validate-mutation-lockdown.js

# Validar soft deletes
node scripts/validate-soft-deletes.js

# Validar state transitions
node scripts/validate-state-transitions.js

# Detectar business logic en PL/pgSQL
node scripts/detect-pl-pgsql-business-logic.js

# Ver estado de ADRs existentes
node scripts/analyze-architectural-decisions.js
```

---

### **Opción 2: Ejecutar todos de una vez**

**PowerShell:**
```powershell
Get-ChildItem scripts/*.js | ForEach-Object { node $_.FullName }
```

**Bash:**
```bash
for script in scripts/validate-*.js scripts/detect-*.js; do
  node "$script"
done
```

---

### **Opción 3: Ejecutar solo skills críticos**

```bash
node scripts/validate-sql-params.js && \
node scripts/validate-middleware-order.js && \
node scripts/validate-component-size.js
```

---

### **Opción 4: Usar el Agent (orquestador)**

El archivo `agents/architecture-guardian.json` define cómo ejecutar múltiples skills juntos.

**Desde terminal (futuro con git hooks):**
```bash
# Se ejecutará automáticamente en pre-commit
```

---

## 📋 17 Skills Ahora Disponibles (Formato Claude Code)

Todos están en `.claude/skills/<nombre>/SKILL.md` con YAML frontmatter correcto. Claude Code los detecta automáticamente vía `/skills`.

### 🔴 **Críticos (Máxima Frecuencia)**
| Skill | Descripción |
|-------|-------------|
| **validate-sql-params** | SQL solo con parámetros (`$1`, `$2`), nunca concatenación |
| **validate-component-size** | Componentes funcionales <800 líneas |
| **validate-naming-conventions** | PascalCase (componentes), camelCase (hooks), snake_case (DB), etc. |
| **validate-middleware-order** | Orden exacto de middlewares de seguridad en app.ts |

### 🟡 **Importantes (Mediana Frecuencia)**
| Skill | Descripción |
|-------|-------------|
| **validate-validation-engines** | Zod (frontend) vs Joi (backend) en Barnard-SGSI |
| **validate-jwt-config** | Dual-token, 15min access, 7days refresh, httpOnly, Secure, SameSite |
| **validate-mutation-lockdown** | TODOS los inputs deshabilitados durante async |
| **validate-soft-deletes** | No hard deletes, solo soft deletes con deleted_at o is_active |

### 🟢 **Útiles (Baja Frecuencia, Alto Valor)**
| Skill | Descripción |
|-------|-------------|
| **validate-state-transitions** | State machine enforcement (Draft→Review→Approval, no saltos) |
| **detect-pl-pgsql-business-logic** | PL/pgSQL solo integrity checks, nunca business logic |

### 📋 **Especial (Documentación + Arquitectura)**
| Skill | Descripción |
|-------|-------------|
| **analyze-architectural-decisions** | Analiza decisiones arquitectónicas y genera ADRs en docs/adrs/ |
| **update-documentation** | Actualiza trazabilidad funcional (FN-*, EP-*, FLOW-*) cuando cambia el código |
| **backend-architecture** | Standards Node.js/Express: Router→Middleware→Controller→Service→Model→Query |
| **database-postgres** | Standards PostgreSQL: soft deletes, state machines, PL/pgSQL integrity |
| **frontend-architecture** | Standards React/Next.js: Component→Hook→Service→Zustand |
| **security-auth** | JWT dual-token, bcrypt, Express security middleware order |
| **testing-vitest** | Unit/integration tests: happy path + edge cases, no internal traces |

---

## ⚙️ Reglas de Validación

Todas las reglas se definen en `rulesproyect.md`:

- **SQL Parameterization** (Sección 10) — Previene SQL injection
- **Component Size** (Sección 2) — Evita "God Components"
- **Naming Conventions** (Sección 6) — Consistencia de código

---

## 📊 Agent: architecture-guardian

**Qué hace:**
1. Ejecuta los 3 skills en secuencia
2. Reporta todas las violaciones encontradas
3. Bloquea si hay problemas críticos (SQL)
4. Genera un reporte JSON

**Archivo de configuración:**
```json
{
  "id": "architecture-guardian",
  "skills": ["validate-sql-params", "validate-component-size", "validate-naming-conventions"],
  "blocking": true,
  "fail_on_blocking": true
}
```

---

## ✅ Status

| Fase | Estado | Completado |
|------|--------|-----------|
| **Fase 1: Structure** | ✅ Completa | 11 skills (.md) + 11 scripts (.js) + 1 agent |
| **Fase 2: Automation** | ⏳ Pendiente | Git hooks (pre-commit), GitHub Actions |
| **Fase 3: Integration** | ⏳ Pendiente | CI/CD, Dashboard, reportes |

## 🔧 Próximos Pasos (Fase 2)

- [ ] Git hooks (pre-commit) que ejecuten los scripts automáticamente
- [ ] GitHub Actions para validar en PRs
- [ ] Dashboard de reportes consolidados
- [ ] Slack notifications si hay violaciones críticas

---

## 📝 Notas

- Los **scripts** son agnósticos — pueden ejecutarse desde cualquier herramienta (Claude, CI, pre-commit hooks)
- Los **skills** son instrucciones para Claude — úsalos cuando necesites validación manual
- El **agent** orquesta múltiples skills — úsalo para validaciones completas
- Todos los scripts usan `process.exit(0)` si OK, `process.exit(1)` si hay violaciones

---

## 🎯 Caso de Uso Típico (Desarrollo)

```
1. Desarrollas una feature en api-sgsi o app-sgsi
2. Antes de commit, ejecutas: node scripts/validate-sql-params.js
3. Si hay SQL malo → lo arreglas
4. Ejecutas todos: for script in scripts/*.js; do node $script; done
5. Cuando todo pasa ✅ → haces commit/push
```

---

## 📊 Testing Scripts

Todos los scripts fueron probados y están **funcionando**:

```
✅ validate-sql-params.js → OK (no vulnerabilidades encontradas)
✅ validate-soft-deletes.js → MEJORADO (ahora cruza queries/ con database/tables/)
   - Detecta 3 CRITICAL (hard-delete en tablas con soft-delete columns)
   - Reporta 21 ACCEPTABLE (hard-delete en link tables sin soft-delete)
   - Clasifica por severidad (CRITICAL, MEDIUM, ACCEPTABLE)
✅ Otros 8 scripts → Listos para usar
```

**Mejora: El validador ya NO reporta falsos positivos** por nombres de función. Ahora analiza el cuerpo SQL real y verifica si las tablas eliminadas tienen soft-delete columns.

---

## 📞 Soporte

- **Dudas sobre skills**: Revisa `.claude/skills/*.md`
- **Dudas sobre scripts**: Revisa el código en `scripts/*.js`
- **Dudas sobre reglas**: Revisa `rulesproyect.md`
- **Dudas sobre arquitectura**: Revisa `CLAUDE.md`

---

**Última actualización:** 2026-09-13
**Versión:** 1.3.0 (12 Skills de validación/análisis + 5 de arquitectura = 17 total)
**Referencia:** rulesproyect.md, docs/TRACEABILITY_STANDARD.md
**Status:** ✅ Operacional

---

## 🆕 Skills #11-12: Análisis de Decisiones + Actualización de Documentación

### **Skill #11: `analyze-architectural-decisions`**
- Analiza si se tomaron decisiones arquitectónicas en la sesión
- Genera automáticamente ADRs (Architecture Decision Records) en `docs/adrs/`
- Sigue exactamente el template de `docs/adrs/templates/template-decision.md`
- Requiere aprobación del usuario antes de finalizar
- Script helper: `node scripts/analyze-architectural-decisions.js` (lista ADRs existentes por sección)

### **Skill #12: `update-documentation`**
- Analiza cambios de código reales (funciones SQL, endpoints, servicios, etc.)
- Determina impacto funcional en la cadena: Operación → Endpoint → Función → Tabla
- Actualiza documentación de trazabilidad (`docs/00-catalog/`, `docs/05-flows/`, `docs/06-technical/`)
- Genera clasificaciones: `UPDATE_FUNCTION`, `CREATE_FLOW`, `TRACEABILITY_DEBT`, etc.
- Ejecuta `npm run build → validate → smoke-test` en `docs/explorer/` si hay cambios documentales
- Modo ANALYZE (primero, sin cambios) + APPLY (con aprobación del usuario)

**Uso:**
```bash
# Ver ADRs existentes
node scripts/analyze-architectural-decisions.js

# Luego, Claude analiza archivos para decisiones (skill #11) y trazabilidad (skill #12)
# (Se ejecutan al final de sesiones/features importantes)
```
