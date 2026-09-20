# Implementación de Autenticación — Bitácora

**Complemento operativo de `MODULO_AUTH.md`.**

`MODULO_AUTH.md` es el diseño (qué debe hacer el sistema y por qué). Este documento es la bitácora de construcción: qué se decidió, qué se corrigió, qué se hizo, qué queda pendiente. Se actualiza cada vez que avanza una historia o se cierra una decisión.

**Historias que cubre este trabajo:**

- HU1 — Iniciar sesión
- HU2 — Cerrar sesión
- Cambio de contraseña por parte del usuario autenticado

**Historias que NO cubre (ABMC de usuarios):** registrar, consultar, modificar y eliminar usuarios (`POST/GET/PATCH/DELETE /users`). Corresponden a HU4 y siguientes, y las implementa otra persona.

---

## 1. Decisiones cerradas

| # | Decisión | Fecha | Fuente |
|---|----------|-------|--------|
| D-01 | Identificador de login: **`username`** (no email). | 2026-09-20 | Definición del equipo. |
| D-02 | Tipo de `id` de entidades: **`Integer` autoincremental**. | 2026-09-20 | Definición del equipo. |
| D-03 | Política de contraseña: **mínimo 8 caracteres, sin restricciones de composición**. Máximo 72 bytes por el truncamiento de bcrypt. | 2026-09-20 | Definición del equipo. |
| D-04 | Vida de tokens: **access 15 min, refresh 7 días**. Variables `JWT_ACCESS_TTL=15m`, `JWT_REFRESH_TTL=7d`. | 2026-09-20 | Definición del equipo. |
| D-05 | Refresh token: **valor opaco (no JWT)** persistido en tabla `refresh_tokens`, con rotación en cada uso y detección de reutilización (revocación de familia). | 2026-09-20 | `MODULO_AUTH.md` §3. |
| D-06 | Access token: **JWT firmado con HS256** (secreto simétrico en `JWT_ACCESS_SECRET`). Claims: `sub` (userId), `role`, `lawyerId` (nullable), `permissions[]`, `exp`, `iat`. | 2026-09-20 | `MODULO_AUTH.md` §3. |
| D-07 | Hashing: **bcrypt** como algoritmo, con factor de costo en `BCRYPT_COST` (variable de entorno, no constante). La implementación concreta se refina en D-13. | 2026-09-20 | `MODULO_AUTH.md` §2. |
| D-08 | Refresh en cookie **`HttpOnly; Secure; SameSite=...`** con nombre y path a fijar. | 2026-09-20 | `MODULO_AUTH.md` §3. |
| D-09 | Alias TS `@shared/*` y `@subsystems/*` definidos en `tsconfig.json`. En build se reescriben con **`tsc-alias`** (`nest build && tsc-alias -p tsconfig.build.json`); en tests se resuelven con `moduleNameMapper` en la sección `jest` del `package.json`. Motivo: `tsc` no reescribe alias al emitir, y Jest tiene su propio resolver que ignora los `paths` del tsconfig. | 2026-09-20 | Sesión de setup. |
| D-10 | **`strict: true`** en `tsconfig.json` (reemplaza los flags parciales `strictNullChecks` / `noImplicitAny` / `strictBindCallApply`). Se agregan de yapa `strictPropertyInitialization` (obliga a inicializar props de entities/DTOs) y `useUnknownInCatchVariables` (`catch (e)` con `e: unknown`), ambos relevantes en un módulo de auth. | 2026-09-20 | Sesión de setup. |
| D-11 | `tsconfig.json` con `rootDir: ./src` e `include: ["src/**/*"]` explícitos. Se retira `baseUrl` (deprecado en TS 7.0); los `paths` se resuelven relativos al `tsconfig.json`. | 2026-09-20 | Sesión de setup. |
| D-12 | Paquetes alineados a NestJS 11: `@nestjs/config` a `^4.0.2` y `@nestjs/jwt` a `^11.0.0` (las versiones anteriores solo declaraban peer para NestJS ≤ 10 y rompían `npm install`). | 2026-09-20 | Sesión de setup. |
| D-13 | Implementación de bcrypt: **`bcryptjs` (pure JS)** en lugar de `bcrypt` (nativo). Motivos: (a) elimina la dependencia transitiva `@mapbox/node-pre-gyp → tar` que tenía una vulnerabilidad crítica; (b) no requiere `node-gyp` ni Visual Studio Build Tools en Windows; (c) la diferencia de performance es despreciable dado que `BCRYPT_COST=12` domina el tiempo de hash. El algoritmo bcrypt (D-07) no cambia; cambia solo la librería. `@types/bcrypt` deja de ser necesario porque `bcryptjs@3` trae tipos propios. | 2026-09-20 | Sesión de setup. |
| D-14 | **Deuda técnica aceptada**: las 5 vulnerabilidades _high_ de `multer` (dependencia transitiva de `@nestjs/platform-express@11`) quedan sin resolver por ahora. Todas se explotan vía _file uploads_ y HU1/HU2/cambio de contraseña no reciben archivos, por lo que son inexplotables desde el scope actual. Se revisan cuando: (a) NestJS 12 sea estable y el equipo decida el bump, o (b) entre al scope alguna funcionalidad que reciba archivos. **No correr `npm audit fix --force`**: fuerza el bump a NestJS 12 y rompe D-12. | 2026-09-20 | Sesión de setup. |

## 2. Preguntas abiertas

| # | Pregunta | Bloquea | Recomendación |
|---|----------|---------|---------------|
| Q-01 | ¿El cambio de contraseña revoca todas las sesiones activas del usuario? | Cambio de contraseña. | **Sí.** Se borran todos los `refresh_tokens` del usuario; el cliente que hizo el cambio recibe una cookie nueva. |
| Q-02 | ¿Se permiten sesiones concurrentes (mismo usuario en dos dispositivos)? | Login. | **Sí**, por defecto. La tabla `refresh_tokens` admite N filas por usuario. |
| Q-03 | ¿Política de bloqueo por intentos fallidos y/o rate limit? | Login (endurecimiento). | Deuda aceptada hasta versión posterior. Rate limit por IP (`@nestjs/throttler`) como mitigación mínima. |
| Q-04 | ¿Qué eventos de autenticación se auditan (login OK, login fallido, logout, cambio de password, revocación por reutilización)? Con qué campos (IP, user agent)? | Cierre de HU1/HU2. | Todos los eventos anteriores, con `userId` (o `username` si no se pudo autenticar), IP y user agent. Alineado con Ley 25.326. |
| Q-05 | ¿Cookies cross-site en dev (frontend Vite 5173 ↔ backend 3000)? | Integración con frontend. | Alternativas: (a) proxy de Vite hacia el backend para mantener mismo origen, (b) `SameSite=None; Secure` con HTTPS local. Preferir (a) mientras no haya HTTPS local. |
| Q-06 | ¿Nombre y `Path` de la cookie de refresh? | Login/refresh/logout. | Nombre: `refresh_token`. Path: `/api/v1/auth` — la cookie no se envía al resto de los endpoints, reduciendo exposición. |
| Q-07 | ¿P-07 se ratifica? Todo usuario con rol `ABOGADO` tiene `lawyerId` obligatorio. | Modelo de `User`. | Sí, mientras el cliente no diga lo contrario. Impacta invariante de `User`. |

## 3. Correcciones a documentación existente

| # | Archivo | Qué corregir |
|---|---------|--------------|
| C-01 | `MODULO_AUTH.md` §1 (modelo de identidad) | `User.email` pasa a `User.username`. `User.id` pasa de `uuid` a `int`. |
| C-02 | `API_CONTRACT_V1.md` §2.1 | La respuesta 200 de `POST /auth/login` debe documentar el header `Set-Cookie: refresh_token=...; HttpOnly; Secure; SameSite=...; Path=/api/v1/auth`. |
| C-03 | `API_CONTRACT_V1.md` (resumen de endpoints + §2) | Falta `POST /auth/refresh`. Agregar entrada. |
| C-04 | `API_CONTRACT_V1.md` §2.1, respuesta 401 | Alinear al formato general `{ error: { code, message, details } }`. Código sugerido: `INVALID_CREDENTIALS`. |
| C-05 | `API_CONTRACT_V1.md` (respuestas de `/users`, `/auth`, etc.) | Los ejemplos muestran `"id": 1` (int). Confirmar coherencia con D-02. |
| C-06 | `MODULO_AUTH.md` §3 | Aclarar que rotación implica: al usar refresh N, se emite N+1 y se marca N como `revoked_at`. Si llega refresh con `revoked_at` no nulo → revocar toda la familia. |

Estas correcciones se aplican **antes** de mergear la implementación, no ahora, para no ensuciar el diseño con inconsistencias sin resolver.

## 4. Alcance de la implementación

**Dentro:**

- Subsistema `identity` con las piezas mínimas para HU1/HU2/cambio de contraseña.
- Entidad `User`, entidad `Role`, entidad `Permission`, VO `Username`.
- Puertos: `UserRepository`, `RoleRepository`, `PasswordHasher`, `TokenIssuer`, `RefreshTokenStore`, `ClockPort` (este último en `shared`).
- Casos de uso: `AuthenticateUser`, `RefreshSession`, `Logout`, `ChangePassword`.
- Adaptadores: `BcryptPasswordHasher`, `JwtTokenIssuer`, `InMemoryUserRepository` y `InMemoryRefreshTokenStore` (transitorios, hasta que llegue Prisma).
- Controlador `AuthController` con `POST /auth/login`, `POST /auth/refresh`, `POST /auth/logout`, `PATCH /auth/password`.
- DTO y mappers HTTP.
- `JwtAuthGuard` y decorador `@RequirePermissions(...)` — viven en `shared` porque los consume todo el resto del sistema.
- Filtro global de errores de dominio y traducción a HTTP.

**Fuera:**

- Endpoints `/users/*` (HU4+).
- Casos de uso `RegisterUser`, `UpdateUser`, `DeleteUser`, `FindUsers`.
- Seed inicial de datos (queda para cuando llegue Prisma; se coordina con HU4).
- Adaptadores Prisma reales (se agregan cuando exista el schema).

**Frontera con HU4:** la persona que implemente HU4 va a reusar la entidad `User` y ampliar `UserRepository` con métodos de escritura (`create`, `deleteById`, `findAll`, `existsByUsername`). No debe modificar los invariantes de la entidad ni los métodos ya definidos.

## 5. Plan de trabajo

Se sigue el orden "de adentro hacia afuera" de `EJEMPLO_CASO_DE_USO.md` §15. Cada paso se cierra con un commit y se marca en la bitácora de §7.

| Paso | Descripción | Estado |
|------|-------------|:------:|
| P-01 | Inicializar proyecto NestJS (package.json, tsconfig, nest-cli, main.ts, app.module.ts) sin tocar la estructura de carpetas. | ✅ |
| P-02 | Kernel compartido: `AuthenticatedUser`, `DomainError` + subtipos, `ClockPort`, filtro HTTP de errores de dominio, middleware de correlación. | ⏳ |
| P-03 | Dominio `identity`: entidad `User`, entidad `Role`, entidad `Permission`, VO `Username`, errores de dominio del subsistema. | ⏳ |
| P-04 | Puertos: `UserRepository`, `RoleRepository`, `PasswordHasher`, `TokenIssuer`, `RefreshTokenStore`. | ⏳ |
| P-05 | Caso de uso `AuthenticateUser` + tests unitarios con repos en memoria. | ⏳ |
| P-06 | Caso de uso `RefreshSession` + tests. Rotación y detección de reutilización. | ⏳ |
| P-07 | Caso de uso `Logout` + tests. | ⏳ |
| P-08 | Caso de uso `ChangePassword` + tests. Revocación de refresh según Q-01. | ⏳ |
| P-09 | Adaptadores concretos no-Prisma: `BcryptPasswordHasher`, `JwtTokenIssuer`. | ⏳ |
| P-10 | Repositorios en memoria (`InMemoryUserRepository`, `InMemoryRefreshTokenStore`). Transitorios. | ⏳ |
| P-11 | `AuthController` + DTOs + mappers HTTP. Endpoints al aire. | ⏳ |
| P-12 | `JwtAuthGuard` + decorador `@RequirePermissions`. `PermissionsGuard`. Ubicados en `shared`. | ⏳ |
| P-13 | Módulo `IdentityModule` + composición en `AppModule`. Config de CORS, `cookie-parser`, `ValidationPipe`, filtro global. | ⏳ |
| P-14 | Aplicación de las correcciones C-01 a C-06 en los documentos correspondientes. | ⏳ |
| P-15 | Reemplazo de repositorios en memoria por los Prisma cuando el schema exista (fuera de este alcance temporal). | 🔒 |

## 6. Variables de entorno esperadas

```
PORT=3000
NODE_ENV=development

JWT_ACCESS_SECRET=<al menos 32 bytes aleatorios>
JWT_ACCESS_TTL=15m
JWT_REFRESH_TTL=7d

BCRYPT_COST=12

COOKIE_REFRESH_NAME=refresh_token
COOKIE_REFRESH_PATH=/api/v1/auth
COOKIE_REFRESH_SAMESITE=Lax   # cambia a None+HTTPS en producción cross-site
COOKIE_SECURE=false           # true en producción

CORS_ALLOWED_ORIGINS=http://localhost:5173
APP_TIMEZONE=America/Argentina/Cordoba
```

La aplicación no debe arrancar si falta alguna obligatoria. La validación ocurre en el arranque, contra un schema (ver `ARQUITECTURA_BACKEND_V1.md` §7.6).

## 7. Bitácora de avance

_Cada entrada se agrega al terminar el paso correspondiente. Formato: fecha · paso · resumen · commit._

| Fecha | Paso | Resumen | Commit |
|-------|------|---------|--------|
| 2026-09-20 | P-01 | Proyecto Nest inicializado: `package.json`, `tsconfig`, `nest-cli.json`, `main.ts` con `ValidationPipe` global, `app.module.ts` con `ConfigModule`. Estructura de carpetas preexistente respetada. | _(pendiente)_ |
| 2026-09-20 | P-01 | Endurecimiento de toolchain (D-09 a D-12): `strict: true`, `include` explícito, `rootDir` explícito, remoción de `baseUrl`, `tsc-alias` en el script `build`, `moduleNameMapper` en Jest. Alineación de `@nestjs/config` a v4 y `@nestjs/jwt` a v11. | _(pendiente)_ |
| 2026-09-20 | P-01 | Reemplazo de `bcrypt` por `bcryptjs` (D-13); baja también `@types/bcrypt` (bcryptjs trae tipos propios). Aceptación formal de la deuda de `multer` (D-14). | _(pendiente)_ |

---

## Historial de versiones

| Versión | Fecha | Cambios |
|---------|-------|---------|
| 1.0 | 2026-09-20 | Versión inicial. Se fijan D-01 a D-08; se abren Q-01 a Q-07; se listan correcciones C-01 a C-06; se define el alcance y el plan de trabajo P-01 a P-15. |
| 1.1 | 2026-09-20 | Endurecimiento de toolchain: se agregan D-09 (alias + `tsc-alias` + Jest `moduleNameMapper`), D-10 (`strict: true`), D-11 (`rootDir`/`include`, remoción de `baseUrl`) y D-12 (bump de `@nestjs/config` y `@nestjs/jwt` para NestJS 11). Nueva entrada en la bitácora §7 con el mismo alcance. |
| 1.2 | 2026-09-20 | Se agregan D-13 (implementación de bcrypt: `bcryptjs` en lugar de `bcrypt` nativo, elimina vuln crítica de `tar`) y D-14 (deuda técnica aceptada por vulns _high_ de `multer`, con condiciones de revisión). Se actualiza D-07 para referenciar D-13. Nueva entrada en bitácora §7. |
