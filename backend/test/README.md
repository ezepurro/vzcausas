# Tests de integración del backend — VZ Causas

Este documento explica cómo funciona la suite de tests del backend: qué se
prueba, cómo está organizada, qué hace cada carpeta y cada componente, y cómo
se corre.

Para ver un spec completo paso a paso, leé
[`docs/Backend-Architecture/EJEMPLO_TEST_INTEGRACION.md`](../../docs/Backend-Architecture/EJEMPLO_TEST_INTEGRACION.md).

---

## 1. Qué se prueba acá

En este proyecto la suite del backend tiene **un solo nivel: tests de
integración**. Cada test:

1. Levanta la aplicación NestJS **completa** (`AppModule`), con la misma
   configuración HTTP que producción.
2. Le hace una petición HTTP real con Supertest:
   controlador → caso de uso → dominio → repositorio Prisma → **PostgreSQL real**.
3. Verifica **dos cosas en el mismo test**:
   - **El comportamiento:** qué quedó (o qué no quedó) guardado en la base.
   - **El contrato de la API:** status HTTP y forma exacta de la respuesta,
     según [`API_CONTRACT_V2.md`](../../docs/Api-Contract/API_CONTRACT_V2.md).

No hay un nivel "API" separado. El contrato se verifica dentro de cada test de
integración con los helpers de `shared/contract/`.

### Lo que queda afuera de esta carpeta

| Qué | Dónde | Por qué |
|---|---|---|
| Lógica pura de dominio (entidades, value objects, cómputo de plazos) | `src/**/*.spec.ts`, al lado del código | No necesita base ni HTTP. Se corre con `npm test` |
| Tests del frontend | `frontend/tests/` | Ver `docs/Frontend-Architecture/TESTING.md` |

---

## 2. Mapa de carpetas

```
backend/test/
├── README.md                     ← este documento
├── jest-integration.config.ts    ← configuración de Jest para la suite
├── tsconfig.json                 ← TypeScript para los tests
│
├── subsystems/                   ← LOS TESTS: un subdirectorio por subsistema
│   ├── identity/                 ← (ejemplo) users.int.spec.ts
│   ├── people/                   ← (ejemplo) lawyers.int.spec.ts
│   └── …                         ← refleja src/subsystems/ uno a uno
│
├── smoke/
│   └── app.int.spec.ts           ← verifica que el harness funciona
│
└── shared/                       ← infraestructura común (no contiene tests)
    ├── harness/                  ← ciclo de vida: contenedor, app, base
    │   ├── global-setup.ts
    │   ├── global-teardown.ts
    │   ├── container-registry.ts
    │   └── test-app.ts
    ├── factories/                ← constructores de datos de test
    │   └── user.factory.ts
    ├── contract/                 ← verificación del contrato de la API
    │   └── envelopes.ts
    ├── auth/                     ← actores autenticados
    │   └── login-as.ts
    └── fakes/                    ← (se crea cuando haga falta) reemplazos de servicios externos
```

---

## 3. Responsabilidad de cada carpeta y componente

### 3.1 Archivos de configuración (raíz de `test/`)

| Archivo | Responsabilidad |
|---|---|
| `jest-integration.config.ts` | Le dice a Jest **qué** correr (`test/**/*.int.spec.ts`), **cómo** compilarlo (ts-jest con `test/tsconfig.json`), cómo resolver los alias `@shared/*` y `@subsystems/*` (`moduleNameMapper`), y qué correr antes y después de toda la suite (`globalSetup` / `globalTeardown`). Fija `maxWorkers: 1` porque todos los specs comparten una sola base y deben correr en serie. `testTimeout: 30000` da margen a las operaciones contra la base. |
| `tsconfig.json` | Extiende el `tsconfig.json` del backend y amplía `rootDir` e `include` para que TypeScript compile tanto `src/` como `test/`. Agrega los tipos de Jest. |

### 3.2 `subsystems/` — los tests

- **Un subdirectorio por subsistema**, con el mismo nombre que en
  `src/subsystems/` (`identity`, `people`, `legal-parameters`, `cases`,
  `deadlines`, `documents`, `reporting`). Quien conoce el código sabe dónde
  buscar el test.
- **Un archivo por recurso o caso de uso**: `lawyers.int.spec.ts`,
  `lend-book.int.spec.ts`. Dentro, un `describe` por endpoint.
- **No contiene helpers.** Lo que se repite entre dos subsistemas se mueve a
  `shared/`.

### 3.3 `smoke/` — test de humo

`app.int.spec.ts` no prueba ninguna funcionalidad del negocio: comprueba que
la suite está bien armada (el contenedor levantó, las migraciones se aplicaron,
`AppModule` arranca, el filtro global de errores y el middleware de
correlación están activos). Si falla, el problema está en el harness, no en un
subsistema.

> Hoy el primer test del smoke está **en rojo a propósito**. El contrato pide
> `RESOURCE_NOT_FOUND` para una ruta inexistente y `DomainErrorFilter`
> responde `NOT_FOUND`. Pasa a verde cuando se corrija el filtro.

### 3.4 `shared/harness/` — ciclo de vida de la suite

| Componente | Cuándo corre | Responsabilidad |
|---|---|---|
| `global-setup.ts` | **Una vez**, antes del primer spec | Levanta un PostgreSQL efímero con **Testcontainers** (`postgres:16-alpine`, la misma versión que `docker/postgres`). Carga las variables de entorno de test (JWT, bcrypt, cookies…) solo si no vienen definidas. Pisa **siempre** `DATABASE_URL` con la del contenedor, así un test nunca toca la base de desarrollo. Aplica las migraciones con `prisma migrate deploy`. |
| `container-registry.ts` | — | Guarda la referencia al contenedor en `globalThis` para que `global-teardown.ts` pueda detenerlo. Jest solo comparte ese contexto entre setup y teardown. |
| `global-teardown.ts` | **Una vez**, al terminar la suite | Detiene y elimina el contenedor. Si la corrida se corta a la fuerza, Testcontainers (Ryuk) lo limpia igual. |
| `test-app.ts` | En `beforeAll` / `afterAll` de cada spec | `startTestApp()` compila `AppModule` y le aplica `configureApp()` (`src/app.setup.ts`), **la misma función que usa `main.ts`**: el test ejercita el mismo prefijo `/api/v1` y el mismo `ValidationPipe` que producción. Acepta un parámetro opcional para reemplazar adaptadores **externos** (correo, Google Drive) por fakes. `stopTestApp()` cierra la app y la conexión. `getPrisma()` da acceso directo a la base para preparar datos y verificar lo persistido. |

### 3.5 `shared/factories/` — datos de test

Una factory por entidad (`<entidad>.factory.ts`), siempre con dos funciones:

| Función | Qué hace | Cuándo se usa |
|---|---|---|
| `a<Entidad>Body(overrides)` | Arma el **cuerpo de una petición HTTP** válido. No toca la base | Para el POST / PATCH que se está probando |
| `create<Entidad>(overrides)` | **Persiste** la entidad directo con Prisma y la devuelve | Para preparar el estado previo: "dado que ya existe…" |

Los valores por defecto son válidos y aleatorios (Faker, locale español). El
test fija con `overrides` **solo** los campos que le importan. Así se lee a
simple vista qué dato es relevante.

> `user.factory.ts` tiene una advertencia: el modelo `User` de Prisma todavía
> no coincide con el contrato (falta `username`; ids UUID vs. enteros).

### 3.6 `shared/contract/` — verificación del contrato

`envelopes.ts` concentra las reglas del contrato (§5 y §6 de
`API_CONTRACT_V2.md`), así ningún spec las repite a mano:

| Helper | Verifica | Devuelve |
|---|---|---|
| `expectData(res, status)` | `{ "data": { … } }` + status + `Content-Type: application/json` | el objeto `data` |
| `expectPaginated(res, expected?)` | `{ "data": [], "pagination": { page, limit, totalItems, totalPages } }` + `200` | el array `data` |
| `expectError(res, status, code, detailFields?)` | `{ "error": { code, message, details } }`. Con `detailFields`, exige esos campos en `details`; sin ellos, `details: null` | — |
| `expectNoContent(res)` | `204` sin cuerpo | — |

Si el contrato cambia, se cambia este archivo y no cada spec.

### 3.7 `shared/auth/` — actores autenticados

`login-as.ts` genera el header `Authorization: Bearer …` firmando un JWT con el
mismo secreto que la app (`JWT_ACCESS_SECRET`) y los claims de D-06. Así un test
de un endpoint protegido prepara su actor en una línea (`asAdmin()`,
`asSecretary()`, `loginAs({ roles, lawyerId })`) sin pasar por
`POST /auth/login`.

> Pendiente: alinear los claims con `JwtTokenIssuer` (P-09) cuando se
> implemente. D-06 dice `role` y D-22 habla de varios roles; hoy se firma
> `roles[]`.

### 3.8 `shared/fakes/` — reemplazos de servicios externos

Todavía no existe; se crea con el primer subsistema que hable con un servicio
externo (correo, Google Drive). Cada fake **implementa el puerto** del dominio,
guarda lo que recibió y puede simular una falla. Se inyecta con el parámetro de
`startTestApp()`:

```typescript
app = await startTestApp((b) => b.overrideProvider(CASE_FOLDER).useValue(fakeDrive));
```

Solo se reemplazan adaptadores de servicios **externos**. Repositorios y
`PrismaService` nunca: la base es real.

---

## 4. Cómo funciona una corrida

```
npm run test:int
   │
   ├─ global-setup.ts ─────► levanta PostgreSQL (Testcontainers)
   │                          aplica migraciones, define DATABASE_URL
   │
   ├─ por cada *.int.spec.ts (en serie):
   │     beforeAll  → startTestApp()      app NestJS contra esa base
   │     beforeEach → getPrisma().<tabla>.deleteMany()   limpia las tablas del spec
   │     it(...)    → factories → petición HTTP → contrato → base
   │     afterAll   → stopTestApp()
   │
   └─ global-teardown.ts ──► detiene el contenedor
```

Hay **un solo contenedor por corrida**, compartido por todos los specs.
Levantarlo cuesta unos segundos; vaciar tablas, milisegundos.

La limpieza de datos **no la hace el harness**: cada spec vacía en su
`beforeEach` las tablas que usa (ver §5).

---

## 5. Convenciones

- **Nombre de archivo:** `<recurso-o-caso-de-uso>.int.spec.ts`, en kebab-case y
  en inglés, como el código (`lawyers.int.spec.ts`,
  `lend-book.int.spec.ts`). El sufijo `.int.spec.ts` es lo que busca la
  configuración de Jest.
- **`describe`:** uno por endpoint, con el método y la ruta:
  `describe('POST /api/v1/lawyers', …)`.
- **`it`:** en castellano, describiendo el comportamiento esperado:
  `it('rechaza una matrícula ya registrada y no guarda nada', …)`.
- **Limpiar en `beforeEach` solo las tablas que usa el spec**, con
  `getPrisma().<tabla>.deleteMany()`. Se borran datos, no el contenedor.
- **Borrar primero las tablas hijas y después las padres.** Si una clave
  foránea no tiene `onDelete: Cascade`, borrar la tabla padre falla mientras
  queden filas hijas.
- **Estructura de cada test:** preparar (factories) → ejecutar (Supertest) →
  verificar el contrato (`expect*`) → verificar la base (`getPrisma()`).
- **Siempre verificar la base en las escrituras.** Un `201` no alcanza: hay que
  confirmar que el registro existe. Un `4xx` tampoco alcanza: hay que confirmar
  que **no** se guardó nada.
- **Discriminar errores por `code`, nunca por `message`.** Es la misma regla
  que sigue el frontend.
- **La base es real.** No se mockean repositorios ni `PrismaService`. Solo se
  reemplazan adaptadores de servicios externos (correo, Google Drive), con el
  parámetro de `startTestApp()`.

---

## 6. Cómo correr los tests

### Requisitos

- **Docker** corriendo (Docker Desktop en Windows y macOS). Testcontainers lo
  usa para levantar la base.
- **Node ≥ 22.22** (lo exige Testcontainers 12).
- `npm install` en `backend/`.

### Desde tu máquina

```bash
cd backend
npm run test:int                          # toda la suite
npm run test:int -- subsystems/people     # solo un subsistema
npm run test:int -- -t "POST /api/v1/lawyers"   # solo un describe / it
```

### Desde el contenedor de desarrollo

```bash
make dev-up      # si no está levantado
make test-int
```

El servicio `backend` del `docker-compose.yaml` monta
`/var/run/docker.sock` y define `TESTCONTAINERS_HOST_OVERRIDE=host.docker.internal`.
Así Testcontainers crea la base de test como un contenedor "hermano" usando el
Docker del host, y se conecta a ella a través del host.

> Montar el socket le da al contenedor control sobre el Docker del host. Es
> aceptable en desarrollo; no se replica en una configuración de producción.

---

## 7. Agregar tests para un subsistema nuevo

1. Crear `test/subsystems/<subsistema>/` si no existe.
2. Si la entidad no tiene factory, crear
   `shared/factories/<entidad>.factory.ts` con `a<Entidad>Body()` y
   `create<Entidad>()`.
3. Crear `<recurso>.int.spec.ts` siguiendo la guía de
   [`EJEMPLO_TEST_INTEGRACION.md`](../../docs/Backend-Architecture/EJEMPLO_TEST_INTEGRACION.md).
4. Correr solo ese archivo hasta que pase; después, toda la suite.

---

## 8. Problemas comunes

| Síntoma | Causa probable | Solución |
|---|---|---|
| `Could not find a working container runtime strategy` | Docker no está corriendo | Iniciar Docker Desktop |
| Desde `make test-int`: timeout conectando a la base | Falta el socket o `TESTCONTAINERS_HOST_OVERRIDE` en el contenedor | Recrear el servicio: `make dev-build` |
| `Cannot find module '@shared/…'` | Import con alias fuera de `moduleNameMapper` | Usar solo `@shared/*` y `@subsystems/*`, o agregar el alias al config de Jest |
| `404` en todas las rutas | La ruta del test no lleva el prefijo | Siempre `/api/v1/...` |
| Un test pasa solo y falla con la suite | Depende de datos de otro test | Limpiar en `beforeEach` las tablas que usa el spec (`deleteMany()`) y crear todo lo que necesita con factories |
| `Foreign key constraint violated` en un `deleteMany()` | Se borró una tabla padre antes que su hija | Invertir el orden: primero la tabla hija, después la padre |
| `SyntaxError: Cannot use import statement outside a module` en Faker | Se instaló Faker v10 (solo ESM) | Usar `@faker-js/faker@^9` |
