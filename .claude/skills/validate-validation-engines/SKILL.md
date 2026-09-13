---
name: validate-validation-engines
description: Valida que Zod se use en frontend (app-sgsi) y Joi en backend (api-sgsi). Usar cuando se agregan schemas de validación o se revisa consistencia.
---


## Descripción
Valida que **Zod** se use en frontend y **Joi** en backend (específico para Barnard-SGSI).

## Regla (de rulesproyect.md)
```
Critical Exception: Validation Engines
- Project: Barnard-SGSI
  * Frontend: Use Zod for schema validation
  * Backend: Use Joi for request validation
- All Other Projects: Use Zod for both
```

## Cómo Ejecutar
```bash
node scripts/validate-validation-engines.js
```

## Qué Busca
1. **Frontend (`app-sgsi/`)**: 
   - ✅ Usa `zod` (import de `zod`)
   - ❌ No usa Joi
2. **Backend (`api-sgsi/`)**:
   - ✅ Usa `joi` (import de `joi`)
   - ❌ No usa Zod para validación de rutas

## Salida
- **OK**: "✅ Validation engines are correct (Zod in frontend, Joi in backend)"
- **ERROR**: "❌ Validation engine mismatch found"

## Ejemplos

### ❌ MAL (Frontend)
```typescript
// app-sgsi/src/...
import Joi from 'joi'; // Debería ser Zod
```

### ✅ BIEN (Frontend)
```typescript
// app-sgsi/src/...
import { z } from 'zod';
```

### ❌ MAL (Backend)
```typescript
// api-sgsi/src/...
import { z } from 'zod'; // Debería ser Joi
```

### ✅ BIEN (Backend)
```typescript
// api-sgsi/src/...
import Joi from 'joi';
```

## Referencias
- Archivo de reglas: `rulesproyect.md` (sección inicio)
