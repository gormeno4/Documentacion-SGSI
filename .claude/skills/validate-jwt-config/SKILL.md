---
name: validate-jwt-config
description: Valida JWT dual-token: access 15min, refresh 7days, httpOnly, Secure, SameSite=Strict, bcryptjs cost >= 12. Usar cuando se edita autenticación o config JWT.
---


## Descripción
Valida que JWT esté configurado correctamente con dual-token, expiries y cookie flags.

## Regla (de rulesproyect.md)
```
JWT 2026 Dual-Token Architecture:
- Access Token: 15 min expiration, stored in client memory (JS variable)
- Refresh Token: 7 days expiration, stored in httpOnly + Secure + SameSite: Strict cookie
- Rotation: Each use generates new refresh token
- Hashing: bcryptjs with cost factor >= 12
```

## Cómo Ejecutar
```bash
node scripts/validate-jwt-config.js
```

## Qué Busca
1. ✅ Access token: 15 min (900 segundos)
2. ✅ Refresh token: 7 days (604800 segundos)
3. ✅ Refresh token cookie: httpOnly, Secure, SameSite=Strict
4. ✅ bcryptjs cost factor >= 12
5. ❌ Tokens hardcodeados o con valores incorrectos

## Salida
- **OK**: "✅ JWT configuration is correct"
- **ERROR**: "❌ JWT configuration violations found"

## Referencias
- Archivo de reglas: `rulesproyect.md` (sección 3)
- Archivos a validar: `api-sgsi/src/config/jwt.ts`, `api-sgsi/src/services/auth.service.ts`
