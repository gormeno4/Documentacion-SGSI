---
name: validate-component-size
description: Valida que componentes funcionales en app-sgsi/src/components/functional no superen 800 líneas. Usar cuando se crean o editan componentes funcionales, o si el usuario pide revisar size/complexity de componentes.
---


## Descripción
Valida que componentes funcionales en `app-sgsi/src/components/functional/` **no superen 800 líneas** de código.

## Regla (de rulesproyect.md)
```
Avoid "God Components" (>800 lines). Functional components are logic-heavy orchestrators 
but must maintain readability and single responsibility.
```

## Cómo Ejecutar
```bash
node scripts/validate-component-size.js
```

## Qué Busca
1. Archivos en `components/functional/` con >800 líneas
2. Reporta nombre del archivo y cantidad de líneas

## Salida
- **OK**: "✅ All functional components are within 800-line limit"
- **WARNING**: Lista de componentes que exceden el límite

## Ejemplos

### ❌ MAL
```typescript
// components/functional/AuditDashboard.tsx
// 1200 líneas de lógica + UI + hooks
export function AuditDashboard() {
  // ... mucho código ...
}
```

### ✅ BIEN
```typescript
// components/functional/AuditDashboard.tsx
// 450 líneas de lógica + hooks + UI
export function AuditDashboard() {
  // ... código bien organizado ...
}
```

## Límite
- **Máximo**: 800 líneas
- **Incluye**: Comentarios, imports, todos los espacios en blanco

## Referencias
- Archivo de reglas: `rulesproyect.md` (sección 2 + 4)
- Ubicación: `app-sgsi/src/components/functional/`
