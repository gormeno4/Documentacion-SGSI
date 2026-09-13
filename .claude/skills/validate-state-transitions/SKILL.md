---
name: validate-state-transitions
description: Valida state machines: Draft→Review→Approval, sin saltos. Usar cuando se implementan flujos de estado o transiciones de status.
---


## Descripción
Valida que **multi-stage workflows** (Draft → Review → Approval) se cumplan en orden. No se permite saltar estados.

## Regla (de rulesproyect.md)
```
Unbreakable State Machines: Multi-stage entity workflows (such as Position documents) 
must be absolute at the Backend level. Entities must mandatorily initialize in their 
defined base state (e.g., Draft). The services/ layer must block any attempt to 
directly transition to advanced states (like "In Revision") that seeks to bypass 
intermediate step requirements.
```

## Cómo Ejecutar
```bash
node scripts/validate-state-transitions.js
```

## Qué Busca
1. ✅ Entidades inician en estado `Draft`
2. ✅ Transiciones secuenciales (Draft → Review → Approval)
3. ❌ Transiciones directas que saltan estados
4. ✅ Lógica de validación en `services/` layer

## Salida
- **OK**: "✅ All state transitions follow the workflow"
- **ERROR**: "❌ Found invalid state transitions"

## Ejemplos

### ❌ MAL (Saltar estados)
```typescript
// Intentar ir de Draft directamente a Approval
position.status = 'Approval'; // ❌ Violación
```

### ✅ BIEN (Orden correcto)
```typescript
// Flujo correcto
// 1. Crear en Draft
const position = new Position({ status: 'Draft' });

// 2. Mover a Review
position.status = 'Review'; // ✅ OK

// 3. Mover a Approval
position.status = 'Approval'; // ✅ OK
```

### ✅ BIEN (Validación en service)
```typescript
// services/position.service.ts
transitionPosition(position, newStatus) {
  const validTransitions = {
    'Draft': ['Review'],
    'Review': ['Approval', 'Draft'],
    'Approval': ['Published']
  };
  
  if (!validTransitions[position.status]?.includes(newStatus)) {
    throw new Error('Invalid transition');
  }
}
```

## Referencias
- Archivo de reglas: `rulesproyect.md` (sección 10)
- Ubicación: `api-sgsi/src/services/`
