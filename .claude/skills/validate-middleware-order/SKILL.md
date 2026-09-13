---
name: validate-middleware-order
description: Valida el orden exacto de middlewares de seguridad en app.ts: trust proxy, Helmet, CORS, rate limiter, HPP, body parser. Usar cuando se edita app.ts o se configura seguridad.
---


## Descripción
Valida que `app.ts` en `api-sgsi` tenga el **orden exacto** de middlewares de seguridad.

## Regla (de rulesproyect.md)
```
Security Layers (Order in app.ts)
1. trust proxy (if behind a load balancer)
2. securityHeaders (Helmet) - NEVER include 'unsafe-inline'
3. corsMiddleware - Origins defined via environment variables
4. rateLimiter - Default 100 req / 15 min
5. hpp() - HTTP Parameter Pollution protection
6. express.json({ limit: "10kb" }) - Body size limit
```

## Cómo Ejecutar
```bash
node scripts/validate-middleware-order.js
```

## Qué Busca
1. ✅ Orden correcto de middlewares en `app.ts`
2. ❌ Middlewares fuera de orden (seguridad crítica)
3. ❌ Helmet sin `'unsafe-inline'`
4. ❌ Body limit incorrecto

## Salida
- **OK**: "✅ Middleware order is correct"
- **ERROR**: "❌ Middleware order violation found at line X"

## Crítico
Este es un validador **bloqueante** — una violación puede exponerse a ataques.

## Referencias
- Archivo de reglas: `rulesproyect.md` (sección 3)
- Archivo a validar: `api-sgsi/src/app.ts`
