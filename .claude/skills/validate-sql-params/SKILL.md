---
name: validate-sql-params
description: Valida que las queries SQL en api-sgsi/src/queries usen solo parámetros posicionales ($1, $2) y nunca concatenación de strings o template literals. Usar cuando se agregan o modifican queries SQL, antes de un commit que toque queries/, o cuando el usuario pida revisar SQL injection o validar parámetros.
---

# Skill: Validate SQL Parameters

## Descripción
Valida que todo SQL en `api-sgsi/src/queries/` use **solo parámetros posicionales** (`$1`, `$2`, etc.) y **nunca concatenación** o template literals.

## Regla (de rulesproyect.md)
```
Absolute Parameterization (SQL): All raw queries in queries/ must exclusively use 
positional parameters ($1, $2). String concatenation or Template Literals to inject 
variables into SQL are strictly forbidden.
```

## Cómo Ejecutar
```bash
node scripts/validate-sql-params.js
```

## Qué Busca
1. ❌ Concatenación: `"SELECT * FROM users WHERE id = '" + id + "'"`
2. ❌ Template literals: `` `SELECT * FROM users WHERE id = ${id}` ``
3. ✅ Parámetros: `"SELECT * FROM users WHERE id = $1"`

## Salida
- **OK**: "✅ All SQL queries use parameterized queries"
- **ERROR**: Lista de archivos/líneas con SQL vulnerable

## Ejemplos

### ❌ MAL
```javascript
// queries/user.ts
const getUserSQL = (id) => `SELECT * FROM users WHERE id = ${id}`;
```

### ✅ BIEN
```javascript
// queries/user.ts
const getUserSQL = "SELECT * FROM users WHERE id = $1";
```

## Referencias
- Archivo de reglas: `rulesproyect.md` (sección 10)
- Ubicación de queries: `api-sgsi/src/queries/`
