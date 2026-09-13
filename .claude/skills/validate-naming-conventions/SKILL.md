---
name: validate-naming-conventions
description: Valida convenciones de nombres: PascalCase (componentes), camelCase (hooks), kebab-case (carpetas), snake_case (DB), SCREAMING_SNAKE (env). Usar cuando se agregan archivos o variables, o si pide revisar naming consistency.
---


## Descripción
Valida que el código siga las **convenciones de nombres** definidas en `rulesproyect.md`.

## Regla (de rulesproyect.md)
```
Naming Conventions:
- Components / UI Files: PascalCase (e.g., RiskMatrix.tsx)
- Hooks / Logic / Functions: camelCase (e.g., useAuditData(), validateUser())
- Project Root Folders: kebab-case (e.g., api-service-v1/)
- Database Columns: snake_case (e.g., user_id, created_at)
- Environment Variables: SCREAMING_SNAKE (e.g., JWT_ACCESS_SECRET)
```

## Cómo Ejecutar
```bash
node scripts/validate-naming-conventions.js
```

## Qué Busca
1. **Archivos .tsx en `components/`**: Deben ser PascalCase
2. **Hooks en `customHooks/` o archivos que empiezan con `use`**: camelCase
3. **Carpetas raíz del proyecto**: kebab-case
4. **Columnas en `queries/`**: snake_case
5. **Variables de entorno en `.env`**: SCREAMING_SNAKE

## Salida
- **OK**: "✅ All naming conventions are correct"
- **WARNINGS**: Lista de archivos/variables con naming incorrecto

## Ejemplos

### ❌ MAL
```
- components/functional/risk_matrix.tsx (debería: RiskMatrix.tsx)
- components/functional/UseAuditData.tsx (debería: useAuditData.tsx)
- customHooks/FetchUser.ts (debería: useFetchUser.ts)
- database/User_Role.ts (debería: user_role.ts)
- env: jwt_secret (debería: JWT_SECRET)
```

### ✅ BIEN
```
- components/functional/RiskMatrix.tsx
- customHooks/useFetchUser.ts
- queries/user_role.ts
- env: JWT_ACCESS_SECRET
```

## Excepciones
- Archivos de configuración pueden no seguir convenciones (`webpack.config.js`, etc.)
- Librerías externas no se validan

## Referencias
- Archivo de reglas: `rulesproyect.md` (sección 6)
