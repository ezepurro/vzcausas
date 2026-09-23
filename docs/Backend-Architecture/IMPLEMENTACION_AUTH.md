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
| D-15 | `ClockPort` expone solo `now()` en esta iteración. `today()` (medianoche en la zona horaria del estudio) se agrega cuando la primera use case de `deadlines` lo requiera. Motivo: postergarlo evita implementar manejo de timezone/DST fuera de scope, y adhiere a la regla "no agregues métodos al puerto si ningún caso de uso los llama". | 2026-09-20 | Sesión P-02. |
| D-16 | Se agrega `UnauthorizedError` como sexto subtipo de `DomainError` (además de los 5 listados en `ARQUITECTURA_BACKEND_V1.md` §7.8). Motivo: el 401 de login (`INVALID_CREDENTIALS`) debe viajar en el mismo envelope `{ error: { code, message, details } }` que el resto de la API. Mantener el filtro global uniforme vale la extensión mínima de la jerarquía. | 2026-09-20 | Sesión P-02. |
| D-17 | Formato de `Username`: 3–50 caracteres, `[a-z0-9._-]`, lowercase forzado por normalización en el VO. Se aplica `trim().toLowerCase()` antes de validar. Consecuencia: `Admin` y `admin` refieren al mismo usuario. | 2026-09-20 | Sesión P-03. |
| D-18 | Usuario inactivo se comunica al cliente como `InvalidCredentialsError` (401, code `INVALID_CREDENTIALS`), igual que credenciales incorrectas. La entidad `User` expone `isActive()`; es responsabilidad del caso de uso `AuthenticateUser` (P-05) decidir devolver el mismo error opaco para no filtrar la existencia del usuario. Alineado con OWASP guidance. `UserNotActiveError` no se crea. | 2026-09-20 | Sesión P-03. |
| D-19 | El invariante cruzado "rol `ABOGADO` implica `lawyerId != null`" (ver Q-07) **no se valida en la entidad `User`**, porque `User.create` solo recibe `roleId` (número), no el nombre del rol. Se valida en el caso de uso `RegisterUserUseCase` de HU4 (fuera del scope actual), que carga `Role` para armar el usuario y por tanto conoce el nombre. Mantiene la entidad simple y pone la lógica de composición donde vive naturalmente. | 2026-09-20 | Sesión P-03. |
| D-20 | Todo el código (identificadores, mensajes de error, comentarios, descripciones de tests) se escribe en **inglés**, conforme `ARQUITECTURA_BACKEND_V1.md` §5.5. La UI mantiene terminología del dominio en español; el código no. Los archivos públicos llevan **JSDoc en inglés** que explica el porqué de la decisión, no lo que hace el código (nombres autoexplicativos alcanzan). | 2026-09-20 | Sesión P-03. |
| D-21 | **API contract v2** (`docs/Api-Contract/API_CONTRACT_V2.md`) es la fuente autoritativa. V1 (`docs/API_CONTRACT_V1.md`) queda superseded. Las correcciones C-01 a C-06 se releen contra V2: algunas ya están aplicadas por V2 (C-01 email→username documentado, C-04 envelope 401), otras dejan de aplicar (C-03 /auth/refresh no existe en V2), otras siguen abiertas (C-02 Set-Cookie del login). | 2026-09-21 | Sesión P-03b. |
| D-22 | `User` soporta **múltiples roles**: `roleId: number` (singular) pasa a `roleIds: readonly number[]` (al menos uno). Cambian consecuentemente: `AuthenticatedUser.roleName → roleNames: readonly string[]`, `AccessTokenClaims.role → roles: string[]`, `RoleRepository.findById → findByIds(ids)` (batch). Motivo: V2 §7.1 unifica el uso plural, y varios usuarios reales del estudio combinan `ADMINISTRATOR` con `LAWYER`. | 2026-09-21 | Sesión P-03b. |
| D-23 | `User` incorpora `fullName: string`, `email: Email` (nuevo VO) y `lastLoginAt: Date \| null`. Nuevo método `registerLogin(now: Date): Date \| null` que rota atómicamente: devuelve el valor anterior y guarda el nuevo. Motivo: V2 §7.2 requiere estos campos en la respuesta de login y en el listado de usuarios; `lastLoginAt` se expone al usuario como acceso *anterior* al actual, para que detecte accesos ajenos. | 2026-09-21 | Sesión P-03b. |
| D-24 | Política de contraseña actualizada: **mínimo 8 caracteres, al menos un dígito, máximo 72 bytes UTF-8**. Motivo: V2 §7.4 lo especifica ("mínimo 8 caracteres con al menos un número"). Reemplaza la política laxa de D-03. Impacta `User.validatePasswordRules` (aplica a `create` y a `changePassword`) y el nuevo error message. | 2026-09-21 | Sesión P-03b. |
| D-25 | Invariante cruzada Q-07 ampliada: **roles ∩ {ADMINISTRATOR, LAWYER} ≠ ∅ ⇒ lawyerId requerido**; solo usuarios con únicamente `SECRETARY` pueden tener `lawyerId = null`. Motivo: V2 §3.2 lo especifica en el alta. Sigue validándose en `RegisterUserUseCase` de HU4 (D-19), no en la entidad. | 2026-09-21 | Sesión P-03b. |
| D-26 | Shape de `POST /auth/refresh` (ausente en V2): request sin body, refresh solo por cookie; 200 devuelve `{ accessToken, tokenType, expiresIn, user }` donde `user` es proyección reducida (`id`, `username`, `roleNames`, `lawyerId`, `permissions`) porque son los campos que pueden variar y afectan autorización; el resto lo conserva el cliente del login. 401 opaco (`UNAUTHENTICATED`) para todos los caminos de fallo (cookie ausente, token inexistente/revocado/expirado, usuario inactivo). En ambas respuestas se manipula la cookie (rotación en éxito, borrado en fallo). Documentado en `API_CONTRACT_V2.md` §3.1. Cierra C-03. | 2026-09-21 | Sesión P-06 (pre-implementación). |
| D-27 | Orden de la rotación en `RefreshSession`: **primero `issue` del refresh nuevo, después `revoke` del viejo**. Motivo: si algo falla entre las dos operaciones, evitamos dejar un token revoked huérfano que en el próximo intento del cliente dispare un falso positivo de reuse y mate la familia del usuario legítimo. En el peor caso quedan dos tokens vivos por un instante — costo tolerable comparado con un deslogueo espurio. Cuando llegue Prisma (P-10) las dos operaciones se envuelven en una transacción y el problema desaparece; hasta entonces el orden importa. | 2026-09-22 | Sesión P-06 (pre-implementación). |
| D-28 | `RefreshSessionUseCase` acepta `refreshToken: string` **sin validar vacío**. `store.find("")` devuelve `null` y colapsa al mismo 401 opaco (D-26). Motivo: el use case queda autodefensivo (no depende del controller para saneamiento) y todos los caminos de falla convergen al mismo error, consistente con la opacidad deliberada de D-26. Simétrico con D-18 en `AuthenticateUser` (username malformado colapsa al mismo `InvalidCredentialsError`). | 2026-09-22 | Sesión P-06 (pre-implementación). |
| D-29 | Al detectar reuso, `revokeFamily(familyId)` revoca **también** al token presentado (que ya estaba revoked). Es idempotente por diseño del port `RefreshTokenStore` (D-05, glossary §7.5). Se documenta acá para que no sorprenda en el test 4 del set de P-06: no hay que llamar además a `revoke(token)` antes de `revokeFamily`. | 2026-09-22 | Sesión P-06 (pre-implementación). |
| D-30 | Shape del command de `Logout`: `{ userId: number; refreshToken: string \| null }`. `userId` sale del `AuthenticatedUser` que inyecta `JwtAuthGuard` (P-12); `refreshToken` lo extrae el controller (P-11) de la cookie `refresh_token`. Se descarta la alternativa "solo `userId` + `revokeAllForUser`" porque mataría todas las sesiones concurrentes del usuario, contradiciendo D-05/Q-02 (se permiten sesiones concurrentes; cada login abre una familia nueva). | 2026-09-22 | Sesión P-07 (pre-implementación). |
| D-31 | Mismatch `stored.userId !== command.userId` en `Logout`: el use case **no revoca y no lanza**, completa silenciosamente. Motivo: negar un side-channel — un caller autenticado no debe poder sondar familyIds ajenos observando si el logout completa o falla. La respuesta al cliente es idéntica exista o no exista el token presentado. | 2026-09-22 | Sesión P-07 (pre-implementación). |
| D-32 | `Logout` usa `revokeFamily(stored.familyId)` (no `revoke(stored.token)`): cierra el linaje entero de rotaciones de esa sesión y, de yapa, cubre el edge de D-27 (dos vivos por fallo intermedio en `RefreshSession`). No afecta a otras sesiones concurrentes del mismo user, que viven en otras familias. Costo: una escritura adicional; irrelevante. | 2026-09-22 | Sesión P-07 (pre-implementación). |
| D-33 | `LogoutUseCase` **no lanza `SessionExpiredError` en ninguna rama**. Todas las anomalías (cookie ausente, token desconocido, cross-user, refresh ya revocado) completan silenciosamente. El 401 de `POST /auth/logout` documentado en API v2 §3.1 es responsabilidad exclusiva de `JwtAuthGuard` (access token). Motivos: (a) el contrato documenta solo 204 y 401, y el 401 está semánticamente reservado a "access malo"; (b) idempotencia OWASP — un doble click o un retry deben completar sin error; (c) simplicidad; (d) los fallos de infraestructura de la store igual propagan como `Error` común → 500. Deuda: cuando aterrice el logger de auditoría (Q-04), los tres caminos silenciosos se loggean como anomalías sin cambiar la respuesta al cliente. | 2026-09-22 | Sesión P-07 (pre-implementación). |
| D-34 | `ChangePassword` emite un refresh nuevo para el caller **después** de `revokeAllForUser(userId)`. La respuesta 204 no lleva body, pero el controller setea la nueva cookie `refresh_token`. Motivo: Q-01 explícito ("el cliente que hizo el cambio recibe una cookie nueva") + nota "la sesión permanece abierta" del contrato §3.1. Sin esto, el user cambia password y a la siguiente request se le rompe la sesión. | 2026-09-22 | Sesión P-08 (pre-implementación). |
| D-35 | `ChangePassword` **no emite un access token nuevo**. El actual queda válido hasta expirar (máx 15 min, D-04) y en el próximo `POST /auth/refresh` se emite uno fresco. Motivo: el contrato responde 204 sin body — no hay dónde ponerlo. Simplifica: el use case no necesita inyectar `TokenIssuer`. | 2026-09-22 | Sesión P-08 (pre-implementación). |
| D-36 | Orden en `ChangePassword`: **`revokeAllForUser` primero, `issue` después**. Si emitiéramos primero, el wipe mataría al refresh recién creado. Trivial pero explícito para justificar el test de orden. | 2026-09-22 | Sesión P-08 (pre-implementación). |
| D-37 | `ChangePassword`: si `findById(userId)` devuelve `null`, se lanza `Error` genérico → 500. Motivo: el guard acaba de autenticar al user; que segundos después el aggregate no exista es un race de integridad (soft- o hard-delete concurrente), no un flujo normal. Mismo criterio que "rol faltante" en P-05/P-06. | 2026-09-22 | Sesión P-08 (pre-implementación). |
| D-38 | `revokeAllForUser(userId)` en `ChangePassword` **incluye por diseño al refresh actual del caller**. El body de `PATCH /auth/password` (`{ currentPassword, newPassword }`) no contiene el refresh — vive en la cookie y el use case no lo recibe. El caller lo pierde y por eso emitimos uno nuevo (D-34). Alternativa "excluir el actual" descartada: requeriría pasar el refresh al use case sin ganancia real (mata igual todas las otras sesiones y hay que revocar+emitir de todas formas). | 2026-09-22 | Sesión P-08 (pre-implementación). |
| D-39 | Validación de env vars de los adapters de P-09: **en el constructor de cada adapter** (fail-fast con `configService.getOrThrow`), no schema centralizado por ahora. Motivo: YAGNI — cada adapter se defiende solo con 2-3 líneas, evitamos setear `@nestjs/config` con `validationSchema` (Joi/Zod) antes de tener trigger real. Cuando aparezca (típicamente en P-13 al componer `AppModule` con todas las envs de una), se centraliza en un schema. | 2026-09-22 | Sesión P-09 (pre-implementación). |
| D-40 | Tests de `BcryptPasswordHasherAdapter` inyectan `BCRYPT_COST=4` vía `FakeConfigService`. Motivo: con cost=12 (D-07) cada hash tarda ~200-400ms — inaceptable en una suite unitaria. cost=4 corre sub-ms y sigue validando el roundtrip real de bcrypt (no es un stub). Producción sigue con 12 vía env. | 2026-09-22 | Sesión P-09 (pre-implementación). |
| D-41 | `JWT_ACCESS_TTL` se parsea con un **mini regex inline** `^(\d+)(s\|m\|h\|d)$` + tabla de multiplicadores, sin agregar dep `ms`. Motivo: 5 líneas de código vs una dep transitiva más para auditar. Cubre los dos usos que tenemos (`JWT_ACCESS_TTL=15m`, `JWT_REFRESH_TTL=7d`). Cualquier valor fuera del formato → bootstrap failure con mensaje accionable. | 2026-09-22 | Sesión P-09 (pre-implementación). |
| D-42 | `JwtTokenIssuerAdapter.verify()` hace **shape check defensivo** de los claims luego de la verificación de firma. Motivo: un JWT con firma válida puede traer claims de la forma vieja (por ej. antes de D-22 el claim era `role: string` en singular). En vez de dejar que pase basura al dominio, se colapsa al mismo `UnauthorizedError("UNAUTHENTICATED", "Invalid or expired access token.")` que un token con firma mala o expirado. El cliente no puede distinguir el motivo desde afuera. | 2026-09-22 | Sesión P-09 (pre-implementación). |
| D-43 | `JWT_ACCESS_SECRET` de menos de 32 bytes UTF-8 → error al arrancar. Motivo: bitácora §6 lo pide como "al menos 32 bytes aleatorios" y un secret corto es un problema real de seguridad (fuerza bruta viable). Mejor bootstrap failure que emitir tokens bajo una clave débil. Se chequea con `Buffer.byteLength(secret, "utf8")`. | 2026-09-22 | Sesión P-09 (pre-implementación). |
| D-44 | Los repositorios en memoria de P-10 **arrancan vacíos**, sin datos hardcodeados. `InMemoryUserRepository` expone un método público `seed(user)` fuera del contrato del puerto, para bootstrap manual en dev/E2E. Motivo: la bitácora §4 ya reserva el seed inicial para cuando llegue Prisma, coordinado con HU4. Consecuencia operativa: nadie puede loguearse en dev hasta que alguien seedee explícitamente o hasta que HU4 traiga `POST /users`. | 2026-09-23 | Sesión P-10 (pre-implementación). |
| D-45 | Los valores opacos de refresh y los `familyId` se generan con **`crypto.randomUUID()`** (builtin de Node, cero dependencias). Cada `issue` produce un token nuevo; cuando entra `familyId: null` se genera además un UUID de familia. El puerto solo exige opacidad, y un UUID v4 la cumple. | 2026-09-23 | Sesión P-10 (pre-implementación). |
| D-46 | `InMemoryRefreshTokenStore` **inyecta `ClockPort`** en lugar de llamar `new Date()` para calcular `expiresAt`. Motivo: el puerto dice que `expiresAt` se computa internamente desde `JWT_REFRESH_TTL`, y con el reloj inyectado los tests del adapter verifican ese cálculo de forma determinista. `ClockPort` ya vive en `shared` y lo consumen otros casos de uso (P-05); el costo es una línea de constructor. | 2026-09-23 | Sesión P-10 (pre-implementación). |
| D-47 | El parser de TTL (`<digits>(s\|m\|h\|d)` → segundos) se **extrae a `shared/config/parse-ttl.ts`**. `JwtTokenIssuerAdapter` deja de tener su copia local (introducida en D-41) y pasa a importarla; `InMemoryRefreshTokenStore` la consume para `JWT_REFRESH_TTL`. Motivo: con dos llamadores reales, duplicar el parser o exportarlo desde el adapter de JWT (rompiendo su encapsulación) son peores que extraerlo. El refactor del adapter es un import y borrar la función interna. | 2026-09-23 | Sesión P-10 (pre-implementación). |
| D-48 | Los adaptadores en memoria son **piezas de producción transitorias**, no fakes de test. No se reutilizan los fakes inline de los specs de P-05 a P-08 ni viceversa: los fakes ejercitan los casos de uso, estos adaptadores cumplen el contrato del puerto y se reemplazan en P-15 por los de Prisma. La duplicación es deliberada y temporal. | 2026-09-23 | Sesión P-10 (pre-implementación). |

## 2. Preguntas abiertas

| # | Pregunta | Bloquea | Recomendación |
|---|----------|---------|---------------|
| Q-01 | ¿El cambio de contraseña revoca todas las sesiones activas del usuario? | Cambio de contraseña. | **Sí.** Se borran todos los `refresh_tokens` del usuario; el cliente que hizo el cambio recibe una cookie nueva. |
| Q-02 | ¿Se permiten sesiones concurrentes (mismo usuario en dos dispositivos)? | Login. | **Sí**, por defecto. La tabla `refresh_tokens` admite N filas por usuario. |
| Q-03 | ¿Política de bloqueo por intentos fallidos y/o rate limit? | Login (endurecimiento). | Deuda aceptada hasta versión posterior. Rate limit por IP (`@nestjs/throttler`) como mitigación mínima. |
| Q-04 | ¿Qué eventos de autenticación se auditan (login OK, login fallido, logout, cambio de password, revocación por reutilización)? Con qué campos (IP, user agent)? | Cierre de HU1/HU2. | Todos los eventos anteriores, con `userId` (o `username` si no se pudo autenticar), IP y user agent. Alineado con Ley 25.326. **Deuda pendiente ligada a D-33**: los caminos silenciosos de `Logout` (cookie ausente, token desconocido, cross-user) también deben emitir eventos de anomalía cuando este logger esté disponible. |
| Q-05 | ¿Cookies cross-site en dev (frontend Vite 5173 ↔ backend 3000)? | Integración con frontend. | Alternativas: (a) proxy de Vite hacia el backend para mantener mismo origen, (b) `SameSite=None; Secure` con HTTPS local. Preferir (a) mientras no haya HTTPS local. |
| Q-06 | ¿Nombre y `Path` de la cookie de refresh? | Login/refresh/logout. | Nombre: `refresh_token`. Path: `/api/v1/auth` — la cookie no se envía al resto de los endpoints, reduciendo exposición. |
| Q-07 | ¿P-07 se ratifica? Todo usuario con rol `ABOGADO` tiene `lawyerId` obligatorio. | Modelo de `User`. | Sí, mientras el cliente no diga lo contrario. Impacta invariante de `User`. **Ubicación de la validación resuelta en D-19**: vive en el caso de uso `RegisterUserUseCase` de HU4, no en la entidad. |

## 3. Correcciones a documentación existente

| # | Archivo | Qué corregir |
|---|---------|--------------|
| C-01 | `MODULO_AUTH.md` §1 (modelo de identidad) | `User.email` pasa a `User.username`. `User.id` pasa de `uuid` a `int`. |
| C-02 | `API_CONTRACT_V1.md` §2.1 | La respuesta 200 de `POST /auth/login` debe documentar el header `Set-Cookie: refresh_token=...; HttpOnly; Secure; SameSite=...; Path=/api/v1/auth`. |
| C-03 | ~~`API_CONTRACT_V1.md`~~ | ✅ **Resuelto 2026-09-21**: `POST /auth/refresh` agregado a `API_CONTRACT_V2.md` §3.1 con shape acordado (D-26). Ver también resumen de endpoints §1. |
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

Se sigue el orden "de adentro hacia afuera" de `EJEMPLO_CASO_DE_USO.md` §15. Cada paso se cierra con un commit y se marca en la bitácora de §8.

| Paso | Descripción | Estado |
|------|-------------|:------:|
| P-01 | Inicializar proyecto NestJS (package.json, tsconfig, nest-cli, main.ts, app.module.ts) sin tocar la estructura de carpetas. | ✅ |
| P-02 | Kernel compartido: `AuthenticatedUser`, `DomainError` + subtipos, `ClockPort`, filtro HTTP de errores de dominio, middleware de correlación. | ✅ |
| P-03 | Dominio `identity`: entidad `User`, entidad `Role`, entidad `Permission`, VO `Username`, errores de dominio del subsistema. | ✅ |
| P-04 | Puertos: `UserRepository`, `RoleRepository`, `PasswordHasher`, `TokenIssuer`, `RefreshTokenStore`. | ✅ |
| P-05 | Caso de uso `AuthenticateUser` + tests unitarios con repos en memoria. | ✅ |
| P-06 | Caso de uso `RefreshSession` + tests. Rotación y detección de reutilización. | ✅ |
| P-07 | Caso de uso `Logout` + tests. | ✅ |
| P-08 | Caso de uso `ChangePassword` + tests. Revocación de refresh según Q-01. | ✅ |
| P-09 | Adaptadores concretos no-Prisma: `BcryptPasswordHasher`, `JwtTokenIssuer`. | ✅ |
| P-10 | Repositorios en memoria (`InMemoryUserRepository`, `InMemoryRefreshTokenStore`). Transitorios. | ✅ |
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

## 7. Glosario de conceptos

Explicaciones en lenguaje llano de los términos técnicos que aparecen en el código y en esta bitácora. Pensado para quien recién empieza con vocabulario de auth.

### 7.1 `Symbol()` como token de DI

`Symbol()` es un valor primitivo de JavaScript **garantizado único**. Dos llamadas a `Symbol("X")` producen valores distintos, aunque compartan la etiqueta. La etiqueta (`"X"`) es solo texto descriptivo para debugging, no participa de la identidad.

Se usa como **token de inyección** en NestJS porque las interfaces de TypeScript no existen en runtime. Nest necesita un identificador concreto para linkear "cuando alguien pida X, entregale Y". Un string podría colisionar entre módulos; un Symbol es imposible de duplicar sin importar la misma constante.

Por eso cada puerto se declara junto a su Symbol:

```ts
export const USER_REPOSITORY = Symbol("USER_REPOSITORY");
export interface UserRepository { ... }
```

Y se enlaza en el módulo:

```ts
providers: [{ provide: USER_REPOSITORY, useClass: PrismaUserRepository }]
```

Y se inyecta en el consumidor:

```ts
constructor(@Inject(USER_REPOSITORY) private readonly users: UserRepository) {}
```

### 7.2 Access token vs refresh token

**El problema.** Si le pedimos al usuario su contraseña en cada request, la UX es horrible. Si emitimos un token de larga vida y se lo roban, no lo podemos invalidar.

**La solución.** Dos tokens con roles distintos:

| | Access token | Refresh token |
|---|---|---|
| Vida | Corta (15 min, D-04) | Larga (7 días, D-04) |
| Formato | JWT firmado (contiene datos) | Cadena opaca (sin datos adentro) |
| Dónde vive | En memoria del frontend | Cookie `HttpOnly; Secure` (D-08) |
| Cómo se valida | Verificando la firma, sin ir a base | Consultando la tabla `refresh_tokens` |
| Se puede revocar? | **No** (válido hasta expirar) | **Sí** (borrando o marcando `revoked_at` en la base) |
| Se manda en cada request | Sí, header `Authorization: Bearer` | No, solo al endpoint `POST /auth/refresh` |

El access token corto acota la ventana de exposición si es robado. El refresh token largo se persiste para poder revocarlo en cualquier momento — eso es lo que hace que HU2 (logout) sea funcional y no decorativa.

### 7.3 Rotación y "familia" del refresh token

**Rotación.** Cada vez que el cliente usa su refresh para pedir un access nuevo, el servidor devuelve un refresh nuevo y revoca el viejo. Un mismo refresh se usa una única vez.

**Familia.** Todos los refresh que van rotando desde un mismo login comparten un `familyId` (UUID opaco). Es el "árbol genealógico" del linaje de refresh.

```
Login   → refresh_A (familyId=F1)
Uso 1   → refresh_B (familyId=F1), refresh_A queda revoked
Uso 2   → refresh_C (familyId=F1), refresh_B queda revoked
```

**Detección de reuso.** Si de repente aparece un uso de `refresh_A` (que ya está revoked), asumimos robo y **revocamos toda la familia F1**. El atacante pierde acceso; el usuario legítimo se ve forzado a loguearse de nuevo. Mejor una molestia puntual que un secuestro persistente. Esta política está codificada en D-05.

### 7.4 `TokenIssuer` — puerto de emisión y verificación del access token

Es la máquina que **firma** los access tokens con el secreto del servidor y **verifica** los que llegan.

- `issue(claims)`: fabrica un JWT nuevo con los claims dados. Devuelve el token firmado y cuánto dura (`expiresIn` en segundos).
- `verify(token)`: comprueba que la firma es válida y no está vencido. Devuelve los claims. Lanza `UnauthorizedError` si algo falla.

Los use cases dependen del puerto, no de `@nestjs/jwt`. Si mañana cambiamos de librería o algoritmo, cambia solo el adapter.

**Tipos:**

- `AccessTokenClaims`: lo que va **dentro** del JWT.
    - `sub`: userId (convención JWT para *subject*).
    - `role`: nombre del rol (ADMINISTRADOR, ABOGADO, SECRETARIA).
    - `lawyerId`: id de ficha profesional si es abogado, `null` en otro caso.
    - `permissions`: lista de permisos, para autorizar sin ir a base en cada request.
- `IssuedAccessToken`: lo que devuelve `issue()`.
    - `token`: la cadena firmada.
    - `expiresIn`: segundos hasta expirar (900 para nuestro caso).

### 7.5 `RefreshTokenStore` — puerto de persistencia del refresh

Guarda, busca y revoca los refresh opacos. No firma nada; los refresh son valores random sin información interna.

- `issue({ userId, familyId })`: crea un refresh nuevo. `familyId=null` arranca una familia nueva (login fresco); un `familyId` existente continúa la familia (rotación).
- `find(token)`: busca un refresh por su valor. **Devuelve el registro aunque esté revocado o expirado** — el use case es el que decide qué hacer con esos casos. Devuelve `null` solo si nunca existió.
- `revoke(token)`: marca un refresh específico como muerto. Usado en logout y en cada rotación.
- `revokeFamily(familyId)`: mata toda una familia. Usado cuando se detecta reuso (§7.3).
- `revokeAllForUser(userId)`: mata todos los refresh de un usuario. Usado al cambiar contraseña (Q-01).

**Tipo `StoredRefresh`** — un registro tal como vive en la base:

- `token`: cadena random opaca (lo que el cliente tiene en la cookie).
- `userId`: a quién pertenece.
- `familyId`: UUID de la familia.
- `expiresAt`: fecha de expiración.
- `revokedAt`: fecha de revocación, o `null` si sigue vivo.

## 8. Bitácora de avance

_Cada entrada se agrega al terminar el paso correspondiente. Formato: fecha · paso · resumen · commit._

| Fecha | Paso | Resumen | Commit |
|-------|------|---------|--------|
| 2026-09-20 | P-01 | Proyecto Nest inicializado: `package.json`, `tsconfig`, `nest-cli.json`, `main.ts` con `ValidationPipe` global, `app.module.ts` con `ConfigModule`. Estructura de carpetas preexistente respetada. | _(pendiente)_ |
| 2026-09-20 | P-01 | Endurecimiento de toolchain (D-09 a D-12): `strict: true`, `include` explícito, `rootDir` explícito, remoción de `baseUrl`, `tsc-alias` en el script `build`, `moduleNameMapper` en Jest. Alineación de `@nestjs/config` a v4 y `@nestjs/jwt` a v11. | _(pendiente)_ |
| 2026-09-20 | P-01 | Reemplazo de `bcrypt` por `bcryptjs` (D-13); baja también `@types/bcrypt` (bcryptjs trae tipos propios). Aceptación formal de la deuda de `multer` (D-14). | _(pendiente)_ |
| 2026-09-20 | P-02 | Kernel compartido: `AuthenticatedUser` (contrato del contexto de seguridad, `shared/domain/`), `DomainError` + 6 subtipos (agrega `UnauthorizedError`, D-16), `ClockPort` con solo `now()` (D-15) + `SystemClockAdapter`, `CorrelationMiddleware` (genera/propaga `X-Correlation-Id`), `DomainErrorFilter` global con normalización de `HttpException` (resuelve parcialmente C-04). `SharedModule` compone: enlaza `CLOCK`, registra el filtro por `APP_FILTER`, aplica el middleware a todas las rutas. `AppModule` importa `SharedModule`. Alias `@shared/*` funciona en runtime, build y tests (D-09). | _(pendiente)_ |
| 2026-09-20 | P-03 | Dominio de `identity`: VO `Username` (D-17) y `Permission`, entidades `Role` y `User` con métodos `hydrate`/`create`, puerto `PasswordHasher` (para HU9 pero requerido por `User.verifyPassword`/`User.changePassword`), errores `InvalidCredentialsError` (D-18), `InvalidCurrentPasswordError`, `WeakPasswordError`. La cross-invariant "ABOGADO ⇒ lawyerId" queda documentada como D-19 (se valida en HU4, no en la entidad). Tests unitarios de `Username` (6 casos) y `User` (7 casos: hydrate, create con happy path + password corta/larga + lawyerId negativo, changePassword con happy + wrong current + weak new). Cero dependencias de infraestructura. | _(pendiente)_ |
| 2026-09-20 | P-03 hotfix | Correcciones detectadas en revisión: (a) rename `AuthenticateUser` → `AuthenticatedUser` en `shared/domain/`; (b) fix typo `verifyPassWord` → `verifyPassword` en `User` (rompía el spec); (c) fix `Promise<Boolean>` → `Promise<boolean>` (tipo primitivo); (d) fix paréntesis en check de `lawyerId` de `User.create` que dejaba pasar enteros negativos. Traducción al inglés de todos los mensajes de error y descripciones de tests. JSDoc en inglés agregado a todos los archivos públicos (D-20). | _(pendiente)_ |
| 2026-09-20 | P-04 | Puertos restantes de `identity`: `UserRepository` (findByUsername / findById / save), `RoleRepository` (findById), `TokenIssuer` (issue / verify + tipos `AccessTokenClaims` e `IssuedAccessToken`, D-06), `RefreshTokenStore` (issue / find / revoke / revokeFamily / revokeAllForUser + tipo `StoredRefresh`, D-05). Cada puerto con su Symbol. `familyId` es `string` (UUID, opaco); `find` devuelve registros incluso si están revocados/expirados para permitir detección de reuso en el use case. | _(pendiente)_ |
| 2026-09-21 | P-03b | Alineación a API contract v2 (D-21 a D-25). Nuevo VO `Email` (regex pragmático, normalización trim+lowercase) con 5 tests. `User` expandido: constructor con 9 campos, incorpora `fullName`, `email`, `roleIds[]`, `lastLoginAt`; método `registerLogin(now)` que rota el valor. Policy de password añade check de dígito. `AuthenticatedUser.roleNames` plural. `AccessTokenClaims.roles` plural. `RoleRepository.findById → findByIds` (batch). Tests de `User` reescritos: 13 casos (hydrate, create con happy + short/no-digit/long password + negative lawyerId + empty/invalid roles + empty fullName, changePassword con happy + wrong current + weak new, registerLogin con primer llamada + subsiguientes). Total del proyecto: 30 tests verdes. | _(pendiente)_ |
| 2026-09-21 | P-05 | Caso de uso `AuthenticateUser` (HU1). Coordina 6 puertos (`UserRepository`, `RoleRepository`, `PasswordHasher`, `TokenIssuer`, `RefreshTokenStore`, `ClockPort`). Flujo: parse username → find user → verify password → check active → load roles by batch → union+dedup permissions → issue access JWT + refresh (nueva familia) → rotar `lastLoginAt` → persistir. Cuatro caminos colapsan al mismo `InvalidCredentialsError` opaco (username malformado, usuario inexistente, password mal, inactivo — D-18). Rol faltante en `findByIds` → `Error` genérico → 500 (integridad de datos, se loguea con correlation id). Fetch del `lawyer` nested queda para el controller (P-11). Tests: 8 casos con fakes inline (happy path, multi-rol con union+dedup de permisos, cada camino de 401 opaco, rol faltante → 500, rotación de `lastLoginAt` entre dos logins). Total del proyecto: 38 tests. | _(pendiente)_ |
| 2026-09-22 | P-06 | Caso de uso `RefreshSession` + nuevo `SessionExpiredError` (code `UNAUTHENTICATED`, message alineado a API v2 §3.1). Coordina 5 puertos: `RefreshTokenStore`, `UserRepository`, `RoleRepository`, `TokenIssuer`, `ClockPort` (no `PasswordHasher`). Flujo: `find(token)` → si revoked ⇒ `revokeFamily` + 401 (reuso, D-05/D-29); si expirado ⇒ 401 sin tocar la familia; si user borrado/inactivo ⇒ 401. `findByIds` — rol faltante ⇒ `Error` → 500. Rotación **issue → revoke** (D-27) para evitar falso positivo de reuso ante fallo intermedio. Familia preservada. `lastLoginAt` intacto (D-26). Proyección reducida del `user` (D-26): `id`, `username`, `roleNames`, `lawyerId`, `permissions`. Tests: 8 casos con fakes inline (happy path con familia preservada + multi-rol union+dedup + token desconocido + reuso con `revokeFamily` disparado + expiración natural sin family kill + user borrado post-login + user inactivo + rol faltante → 500). Total del proyecto: 46 tests. | `28c9346` |
| 2026-09-22 | P-07 | Caso de uso `Logout` (HU2). Único puerto: `RefreshTokenStore` (sin `ClockPort` ni repos). Command `{ userId, refreshToken: string \| null }` (D-30). Flujo silencioso en 4 ramas (D-33): cookie ausente → return; `find` null → return; `stored.userId !== userId` → return (D-31, niega side-channel para sondar familyIds ajenos); happy → `revokeFamily(stored.familyId)` (D-32, cubre el edge D-27 y no toca otras sesiones concurrentes del user). El 401 documentado en §3.1 lo tira exclusivamente `JwtAuthGuard` (P-12); este use case nunca lanza `SessionExpiredError`. No requiere error nuevo. Tests: 5 casos con `FakeRefreshStore` que trackea `revokeCalls`, `revokeFamilyCalls`, `revokeAllForUserCalls` para verificar tanto efecto como blast radius (happy path + cookie ausente + token desconocido + cross-user D-31 + idempotencia con token ya revocado). Total del proyecto: 51 tests. | `44340fb` |
| 2026-09-22 | P-08 | Caso de uso `ChangePassword`. Puertos: `UserRepository`, `PasswordHasher`, `RefreshTokenStore` (sin `ClockPort`, sin `TokenIssuer`, sin `RoleRepository`). Delega verificación de current + policy del new en `User.changePassword` (los errores `InvalidCurrentPasswordError` → 422 y `WeakPasswordError` → 400 vienen de ahí, sin duplicación). Flujo: `findById` (null → `Error` genérico → 500, D-37) → `user.changePassword` → `save` → `revokeAllForUser(userId)` (mata TODAS las sesiones incluida la del caller, D-38) → `issue({familyId: null})` (familia nueva para el caller, D-34 + D-36). No emite access nuevo (D-35): el viejo sigue vivo hasta expirar (máx 15 min). Result: `{ refreshToken, refreshExpiresIn }` para que el controller rote la cookie. Tests: 7 casos con `FakeRefreshStore` que trackea `callOrder` para verificar el orden revoke→issue (happy con wipe y fresh refresh + current wrong sin efectos + weak password short + weak password sin dígito + orden D-36 explícito + familia nueva ≠ familia previa + findById null → Error). Total del proyecto: 58 tests. | `913d8c9` |
| 2026-09-23 | P-10 | Repositorios en memoria en `identity/infrastructure/persistence/in-memory/`: `InMemoryUserRepository` (doble índice `byId` + `byUsername` normalizado por el VO, D-17; método `seed()` fuera del contrato del puerto, D-44) e `InMemoryRefreshTokenStore` (tokens y familias con `crypto.randomUUID()`, D-45; `ClockPort` inyectado para `expiresAt`, D-46; devuelve copias defensivas en cada lectura para que nadie mute el store por referencia; `markRevoked` conserva el primer timestamp, garantizando la idempotencia que `Logout` y la detección de reuso asumen). Refactor asociado: el parser de TTL sale de `jwt-token-issuer.adapter.ts` a `shared/config/parse-ttl.ts` (D-47), con su propio spec. Ambos adaptadores son producción transitoria, no fakes de test (D-48); P-15 los reemplaza por los de Prisma. Sin registro en módulos todavía (P-13). Tests: 4 de `parse-ttl` + 5 de user repo + 9 de refresh store. Cero deps nuevas. Total del proyecto: 86 tests. | _(pendiente)_ |
| 2026-09-22 | P-09 | Adaptadores no-Prisma en `identity/infrastructure/external/`: `BcryptPasswordHasherAdapter` (implementa `PasswordHasher` con `bcryptjs`, D-13; cost de env `BCRYPT_COST`, validado en constructor al rango [4, 15], D-39) y `JwtTokenIssuerAdapter` (implementa `TokenIssuer` con `@nestjs/jwt`, HS256, D-06; secret de `JWT_ACCESS_SECRET` con check de ≥32 bytes al bootstrap, D-43; TTL de `JWT_ACCESS_TTL` parseado con mini regex inline `<digits>(s\|m\|h\|d)`, D-41). `verify` colapsa firma inválida, expirado y claims malformados al mismo `UnauthorizedError` opaco (D-42), con shape check defensivo por si aparece un JWT viejo con `role` singular pre-D-22. Sin registrar en ningún módulo todavía (P-13 hará la composición). Tests: 4 casos de bcrypt con cost=4 vía `FakeConfigService` (D-40) para no ralentizar la suite, y 6 casos de jwt (roundtrip issue+verify + parseo TTL 7d + wrong secret → 401 + claims malformados → 401 + secret corto → boot fail + TTL inválido → boot fail). Cero deps nuevas (todo estaba en package.json desde P-01/D-12/D-13). Total del proyecto: 68 tests. | `07a5be2` |

---

## Historial de versiones

| Versión | Fecha | Cambios |
|---------|-------|---------|
| 1.0 | 2026-09-20 | Versión inicial. Se fijan D-01 a D-08; se abren Q-01 a Q-07; se listan correcciones C-01 a C-06; se define el alcance y el plan de trabajo P-01 a P-15. |
| 1.1 | 2026-09-20 | Endurecimiento de toolchain: se agregan D-09 (alias + `tsc-alias` + Jest `moduleNameMapper`), D-10 (`strict: true`), D-11 (`rootDir`/`include`, remoción de `baseUrl`) y D-12 (bump de `@nestjs/config` y `@nestjs/jwt` para NestJS 11). Nueva entrada en la bitácora §8 con el mismo alcance. |
| 1.2 | 2026-09-20 | Se agregan D-13 (implementación de bcrypt: `bcryptjs` en lugar de `bcrypt` nativo, elimina vuln crítica de `tar`) y D-14 (deuda técnica aceptada por vulns _high_ de `multer`, con condiciones de revisión). Se actualiza D-07 para referenciar D-13. Nueva entrada en bitácora §8. |
| 1.3 | 2026-09-20 | P-02 y P-03 aplicados y marcados ✅. Se agregan D-15 (`ClockPort` solo con `now()`), D-16 (`UnauthorizedError` como sexto subtipo), D-17 (formato de `Username`), D-18 (usuario inactivo devuelve `InvalidCredentialsError` opaco), D-19 (cross-invariant ABOGADO/lawyerId se valida en HU4) y D-20 (todo en inglés + JSDoc). Q-07 se anota apuntando a D-19. Cuatro entradas nuevas en la bitácora §8 (dos para P-02 y P-03 y una hotfix con fixes de typos + paréntesis + tipo). |
| 1.4 | 2026-09-20 | P-04 aplicado y marcado ✅ (cuatro puertos: `UserRepository`, `RoleRepository`, `TokenIssuer`, `RefreshTokenStore`, cada uno con Symbol). Se agrega §7 "Glosario de conceptos" que explica en lenguaje llano `Symbol` como token de DI, access vs refresh token, rotación y familia con detección de reuso, y el propósito de `TokenIssuer` y `RefreshTokenStore` con sus tipos (`AccessTokenClaims`, `IssuedAccessToken`, `StoredRefresh`). "Bitácora de avance" pasa a §8. Nueva entrada en §8 para P-04. |
| 1.5 | 2026-09-21 | Alineación a `docs/Api-Contract/API_CONTRACT_V2.md` como fuente autoritativa (D-21). Rework del modelo de `User` para soportar multi-rol (D-22), campos `fullName`/`email`/`lastLoginAt` (D-23), password con dígito (D-24), invariante cruzada extendida a ADMINISTRATOR+LAWYER (D-25). Nuevo VO `Email`. `AccessTokenClaims` y `AuthenticatedUser` plural. `RoleRepository.findById → findByIds`. Nueva entrada P-03b en §8. Total de tests pasando: 30. |
| 1.6 | 2026-09-21 | P-05 aplicado y marcado ✅: caso de uso `AuthenticateUser` con JSDoc en inglés (D-20), 8 tests unitarios con fakes inline (repos, hasher, tokenIssuer, refreshStore, clock). Colapso de 4 caminos de fallo al mismo error opaco (D-18). Rol faltante degrada a 500 con log. Nueva entrada P-05 en §8. Total de tests pasando: 38. |
| 1.7 | 2026-09-21 | D-26: shape de `POST /auth/refresh` acordado y documentado en `API_CONTRACT_V2.md` §3.1 (`user` proyección reducida, 401 opaco, cookie rotada/borrada). Cierra C-03. Preparación para P-06. |
| 1.8 | 2026-09-22 | Cierre de decisiones de P-06 pre-implementación: D-27 (orden `issue` → `revoke` para evitar falsos positivos de reuse), D-28 (`refreshToken: string` sin validar vacío, colapsa al 401 opaco), D-29 (`revokeFamily` cubre al token presentado, idempotente). P-06 queda desbloqueado para implementación. |
| 1.9 | 2026-09-22 | P-06 aplicado y marcado ✅: caso de uso `RefreshSession` + nuevo `SessionExpiredError` (`UNAUTHENTICATED`, mensaje del contrato v2 §3.1). 8 tests unitarios con fakes inline (repos, tokenIssuer, refreshStore con estado real que mantiene `revokedAt`, clock). Aplica D-26 (401 opaco + proyección reducida del `user` + `lastLoginAt` intacto), D-27 (rotación `issue → revoke`) y D-29 (`revokeFamily` cubre al presentado). Nueva entrada P-06 en §8. Total de tests pasando: 46. |
| 1.10 | 2026-09-22 | Cierre de decisiones de P-07 pre-implementación: D-30 (shape del command con `userId` + `refreshToken: string \| null`, descartada la alternativa `revokeAllForUser`), D-31 (silencioso ante cross-user para negar side-channel), D-32 (`revokeFamily` en lugar de `revoke(token)`), D-33 (nunca lanza; el 401 lo tira exclusivamente `JwtAuthGuard`). Q-04 anotada con deuda de logging para los caminos silenciosos de logout. P-07 queda desbloqueado para implementación. |
| 1.11 | 2026-09-22 | P-07 aplicado y marcado ✅: caso de uso `Logout` (HU2), único puerto `RefreshTokenStore`, 5 tests con `FakeRefreshStore` que trackea el blast radius de las revocaciones. Aplica D-30 a D-33; sin error nuevo. Bitácora §8 actualizada con la entrada P-07 y `28c9346` como commit de P-06. Total de tests pasando: 51. |
| 1.12 | 2026-09-22 | Cierre de decisiones de P-08 pre-implementación: D-34 (refresh nuevo para el caller post-wipe), D-35 (no se emite access nuevo — sigue el viejo hasta expirar), D-36 (orden revoke → issue), D-37 (findById null ⇒ Error → 500), D-38 (`revokeAllForUser` cubre al refresh del caller por diseño). P-08 queda desbloqueado para implementación. |
| 1.13 | 2026-09-22 | P-08 aplicado y marcado ✅: `ChangePasswordUseCase` (3 puertos, sin error nuevo), 7 tests con `FakeRefreshStore` que trackea `callOrder`. Aplica D-34 a D-38. Bitácora §8 actualizada con las entradas P-07 (`44340fb`) y P-08 (`913d8c9`). Total de tests pasando: 58. |
| 1.14 | 2026-09-22 | Cierre de decisiones de P-09 pre-implementación: D-39 (validación de env en constructor de cada adapter, no schema por ahora), D-40 (cost=4 en tests de bcrypt), D-41 (mini regex inline para parsear TTL, sin dep `ms`), D-42 (shape check defensivo en `verify` que colapsa al mismo `UnauthorizedError` opaco), D-43 (secret < 32 bytes → bootstrap failure). P-09 queda desbloqueado para implementación. |
| 1.15 | 2026-09-22 | P-09 aplicado y marcado ✅ (`07a5be2`): `BcryptPasswordHasherAdapter` + `JwtTokenIssuerAdapter` en `identity/infrastructure/external/`, cada uno con constructor guard (D-39/D-43) y sin registro en módulos todavía. Tests: 4 bcrypt + 6 jwt con `FakeConfigService` compartido. Aplica D-39 a D-43. Nueva entrada P-09 en §8. Total de tests pasando: 68. |
| 1.16 | 2026-09-23 | Cierre de decisiones de P-10 pre-implementación: D-44 (repos vacíos + `seed()` fuera del puerto), D-45 (`crypto.randomUUID()` para tokens y familias), D-46 (`ClockPort` inyectado en el store), D-47 (parser de TTL extraído a `shared/config/parse-ttl.ts`, con refactor del adapter de JWT), D-48 (los adaptadores en memoria son producción transitoria, no fakes de test). P-10 queda desbloqueado para implementación. |
| 1.17 | 2026-09-23 | P-10 aplicado y marcado ✅: `InMemoryUserRepository` + `InMemoryRefreshTokenStore` en `identity/infrastructure/persistence/in-memory/`, más la extracción de `parseTtlToSeconds` a `shared/config/` con su spec. Aplica D-44 a D-48. Nueva entrada P-10 en §8. Total de tests pasando: 86 (13 suites). Quedan 4 pasos del alcance: P-11 (controller + DTOs), P-12 (guards), P-13 (módulos y composición), P-14 (correcciones C-01 a C-06). |
