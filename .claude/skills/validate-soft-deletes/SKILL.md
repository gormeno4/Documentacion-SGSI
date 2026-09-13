---
name: validate-soft-deletes
description: Valida que deletes sean soft (deleted_at=now() o is_active=false), no hard. Resuelve funciones SQL reales y verifica tabla schemas. Usar cuando se tocan queries de delete.
---


## Descripción
Valida que **nunca haya hard deletes**. Los datos se marcan como `is_active = false` después de verificar dependencias.

## Regla (de rulesproyect.md)
```
Physical Deletion and Dependency Lockdown (Soft Deletes): Physical deletion 
(Hard Delete) of critical information is strictly prohibited. It is mandatory 
to implement Soft Deletes (e.g., is_active = false), but the system must strictly 
prevent the deletion of records without prior dependency validation.
```

## Cómo Ejecutar
```bash
node scripts/validate-soft-deletes.js
```

## Qué Busca

**Enfoque 1: Extrae llamadas a funciones desde queries/**
- Identifica patrones como `sgsi.v2_kpi_delete_by_id($1, $2, $3)` en `api-sgsi/src/queries/*.ts`

**Enfoque 2: Resuelve la función SQL real**
- Mapea `sgsi.v2_kpi_delete_by_id` → archivo real `api-sgsi/sql/sgsi/database/sgsi/functions/v2_kpi_delete_by_id.sql`
- Busca en cada schema (`sgsi`, `corvus`) automáticamente

**Enfoque 3: Analiza el cuerpo SQL**
- ✅ Soft delete válido:
  - `UPDATE table SET deleted_at = now(), deleted_by = ...` (patrón real del proyecto)
  - `UPDATE table SET is_active = false` (patrón documentado en rulesproyect.md)
- ❌ Hard delete sin soft-delete pattern:
  - `DELETE FROM table WHERE ...` (sin UPDATE de soft-delete)
- ⚠️ Mixto (ambos patrones en la misma función):
  - Sospechoso si hay overloads — requiere revisión

## Salida
- **OK**: "✅ All delete functions use soft-delete patterns (deleted_at or is_active)"
- **ERROR**: "❌ Found hard-delete violation(s) (DELETE FROM sin soft-delete pattern)"
- **SKIPPED**: Funciones no encontradas en `database/` (legacy o externas, información)

## Ejemplos

### ❌ MAL (Hard Delete)
```sql
-- queries/user.ts
SELECT * FROM corvus.v2_user_delete_by_id($1, $2);
-- Función en database/corvus/functions/v2_user_delete_by_id.sql contiene:
DELETE FROM corvus.user WHERE id = $1; -- ❌ Hard delete real
```

### ✅ BIEN (Soft Delete patrón 1: deleted_at)
```sql
-- queries/kpi.ts
SELECT * FROM sgsi.v2_kpi_delete_by_id($1, $2, $3);
-- Función en database/sgsi/functions/v2_kpi_delete_by_id.sql contiene:
UPDATE sgsi.kpi SET deleted_at = now(), deleted_by = $2 WHERE id = $1; -- ✅ Soft delete
```

### ✅ BIEN (Soft Delete patrón 2: is_active)
```sql
-- queries/asset.ts
SELECT * FROM sgsi.asset_delete_by_id($1, $2);
-- Función contiene:
UPDATE sgsi.asset SET is_active = false WHERE id = $1; -- ✅ Soft delete
```

## Notas Importantes

- **Falsos positivos evitados**: El script ahora resuelve funciones reales en `database/`, no adivina por nombre.
- **Ambos patrones aceptados**: `deleted_at = now()` y `is_active = false` son válidos como soft delete.
- **Link tables**: Si una tabla es de unión/join sin columnas de soft-delete, un `DELETE FROM` real es aceptable (el script reporta como advertencia).

## Referencias
- Archivo de reglas: `rulesproyect.md` (sección 10)
- Estructura: `api-sgsi/src/queries/` (caller) → `api-sgsi/sql/sgsi/database/<schema>/functions/` (definición)
