---
name: detect-pl-pgsql-business-logic
description: Detecta si PL/pgSQL contiene business logic (debería tener solo integrity/audit). Usar cuando se modifican funciones o triggers en database/.
---


## Descripción
Valida que **PL/pgSQL functions y triggers** se usen SOLO para integrity checks, audit logs o cálculos masivos. **Nunca para business logic.**

## Regla (de rulesproyect.md)
```
Logic Separation in Database (Zero Hidden Logic): Database-native functions 
(PL/pgSQL) or triggers must be exclusively limited to integrity validations, 
audit logs, or massive aggregation calculations. Complex business rules and 
orchestration must always be maintained in the Node.js layer (services/).
```

## Cómo Ejecutar
```bash
node scripts/detect-pl-pgsql-business-logic.js
```

## Qué Busca
1. ✅ PL/pgSQL solo para:
   - Integrity checks (constraints, validations)
   - Audit logging
   - Massive calculations (aggregations)
2. ❌ Business logic en PL/pgSQL:
   - Conditionals complejos
   - State machines
   - Reglas de negocio
   - Cálculos de reportes
3. ❌ Funciones que hacen cambios múltiples en tablas

## Salida
- **OK**: "✅ PL/pgSQL contains only integrity/audit logic"
- **WARNING**: "⚠️  Potential business logic found in PL/pgSQL"

## Ejemplos

### ❌ MAL (Business Logic en DB)
```sql
-- Función con lógica de negocio
CREATE OR REPLACE FUNCTION approve_position()
RETURNS void AS $$
BEGIN
  UPDATE positions SET status = 'Approved' WHERE ...;
  UPDATE stakeholders SET role = 'Reviewer' WHERE ...;
  INSERT INTO audit_log ...;
  NOTIFY app_events, 'position_approved';
END;
$$ LANGUAGE plpgsql;
```

### ✅ BIEN (Solo Integrity)
```sql
-- Trigger para audit logging
CREATE OR REPLACE FUNCTION audit_position_changes()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO audit_log (entity, action, old_data, new_data)
  VALUES ('position', TG_OP, row_to_json(OLD), row_to_json(NEW));
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER position_audit AFTER UPDATE ON positions
FOR EACH ROW EXECUTE FUNCTION audit_position_changes();
```

### ✅ BIEN (Massive Calculation)
```sql
-- Función para cálculos de agregación
CREATE OR REPLACE FUNCTION calc_risk_matrix_totals()
RETURNS void AS $$
BEGIN
  UPDATE risk_matrix_summary SET
    total_risks = (SELECT COUNT(*) FROM risks WHERE is_active = true),
    high_risks = (SELECT COUNT(*) FROM risks WHERE severity = 'high')
  WHERE project_id = $1;
END;
$$ LANGUAGE plpgsql;
```

## Referencias
- Archivo de reglas: `rulesproyect.md` (sección 10)
- Ubicación: `_database/` (migrations, functions, triggers)
