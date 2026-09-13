---
name: validate-mutation-lockdown
description: Valida que durante async (isLoading), TODOS los inputs estén deshabilitados, no solo submit. Usar cuando se implementan formularios o mutaciones.
---


## Descripción
Valida que durante mutaciones asincrónicas (`isLoading`, `isSubmitting`), **TODOS** los inputs estén deshabilitados, no solo el botón submit.

## Regla (de rulesproyect.md)
```
Total Mutation Lockdown (The Barrier): When initiating an asynchronous request 
(e.g., isLoading, isSubmitting), disabling only the submit button is insufficient. 
The disabled or readOnly property must be propagated to all inputs, selects, and 
textareas within the interactive form to prevent data alterations while the request 
is in flight.
```

## Cómo Ejecutar
```bash
node scripts/validate-mutation-lockdown.js
```

## Qué Busca
1. **Componentes funcionales en `app-sgsi/src/components/functional/`**:
   - ✅ `disabled={isLoading}` en todos los inputs/selects/textareas
   - ✅ No solo el submit button
2. ❌ Solo submit button deshabilitado
3. ❌ Inputs sin `disabled` durante mutation

## Salida
- **OK**: "✅ All forms have proper mutation lockdown"
- **WARNING**: "⚠️  Found forms without complete input locking"

## Ejemplos

### ❌ MAL
```typescript
<form>
  <input type="text" /> {/* No disabled */}
  <button disabled={isLoading}>Submit</button> {/* Solo el botón */}
</form>
```

### ✅ BIEN
```typescript
<form>
  <input type="text" disabled={isLoading} />
  <input type="email" disabled={isLoading} />
  <textarea disabled={isLoading} />
  <button disabled={isLoading}>Submit</button>
</form>
```

## Referencias
- Archivo de reglas: `rulesproyect.md` (sección 9)
- Ubicación: `app-sgsi/src/components/functional/`
