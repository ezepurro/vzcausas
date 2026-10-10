# VZ Causas — Setup

Guía para levantar el entorno de desarrollo local. Todo corre en Docker orquestado con `make`; no hace falta instalar Node, Postgres, etc. en el host.

## 1. Requisitos

Instalar en el equipo:

- **Docker Desktop** (incluye Docker Compose v2) — `docker --version` y `docker compose version` deben andar.
- **Make** — en Windows no viene por defecto:
  - Con [Git for Windows](https://git-scm.com/) alcanza con correr los comandos desde **Git Bash**, o instalar `make` con `choco install make` / `scoop install make`.
  - En macOS/Linux ya está instalado o se consigue con el gestor de paquetes del sistema (`brew install make`, `apt install make`, etc.).
- **Git**.

No hace falta Node.js instalado en el host: el backend y el frontend corren dentro de sus contenedores (`node:22-alpine`), con hot-reload vía bind mount.

## 2. Variables de entorno

El único `.env` que necesita el flujo Docker es el de `docker/`:

```bash
cp docker/.env.example docker/.env
```

Para desarrollo local los valores por defecto de `docker/.env.example` sirven tal cual — no hay que editar nada para levantar el proyecto. Si vas a exponer el entorno a algo más que tu máquina, cambiá los secretos (`JWT_ACCESS_SECRET`, credenciales de Postgres).

> `backend/.env.example` solo es necesario si corrés el backend **fuera** de Docker (`npm run start:dev` directo en el host). El flujo recomendado (`make dev-up`) no lo usa: dentro de Docker, todas las variables las inyecta `docker/.env` vía `env_file` en el `docker-compose.yaml`.

Variables que trae `docker/.env.example`:

| Variable | Para qué |
|---|---|
| `POSTGRES_USER` / `POSTGRES_PASSWORD` / `POSTGRES_DB` | Credenciales de la base. Las usa el contenedor de Postgres para crearla y el backend para armar el `DATABASE_URL` (el compose lo arma solo, no hace falta declararlo). También son las credenciales para entrar por **Adminer** — ver §3. |
| `JWT_ACCESS_SECRET`, `JWT_ACCESS_TTL`, `JWT_REFRESH_TTL` | Firma y vencimiento de los tokens de sesión. |
| `BCRYPT_COST` | Costo de hashing de contraseñas. |
| `COOKIE_REFRESH_*`, `COOKIE_SECURE` | Atributos de la cookie `httpOnly` que guarda el refresh token. |
| `CORS_ALLOWED_ORIGINS` | Orígenes permitidos a llamar la API, separados por coma: el frontend (`:5173`) y Swagger UI (`:8081`). Si tu `docker/.env` es anterior a Swagger, agregá `http://localhost:8081` a mano — ver §3. |
| `APP_TIMEZONE` | Zona horaria del estudio: rige el cálculo de plazos y el formato de fechas de la API. |
| `DEV_SEED_USERNAME` / `DEV_SEED_PASSWORD` | Credenciales del **usuario administrador que el backend crea solo** al arrancar en desarrollo. `DEV_SEED_PASSWORD` es además la contraseña de los usuarios de prueba que crea el seed. Sin estas variables el backend no crea al administrador — ver §4. |
| `VITE_USE_MOCKS` | `true` por defecto: el frontend responde con datos simulados (MSW) en vez de llamar al backend real. Ver §4. |
| `VITE_BACKEND_URL` | A dónde apunta el proxy de Vite cuando los mocks están apagados. Dentro de Docker tiene que ser `http://backend:3000` (el nombre del servicio, no `localhost`). |

Las del backend (`JWT_*`, `BCRYPT_COST`, `COOKIE_*`, `CORS_ALLOWED_ORIGINS`, `APP_TIMEZONE`) son obligatorias y se validan al arrancar (`backend/src/config/env.validation.ts`): si falta alguna, el contenedor corta con un error que las lista a todas.

## 3. Primer levantamiento

```bash
make dev-build       # build de las imágenes + levanta todo en segundo plano
```

No hace falta correr migraciones ni seed a mano: en cada `make dev-up` / `make dev-build` el servicio `migrate` aplica las migraciones pendientes (`prisma migrate deploy`) y corre el seed (`prisma db seed`, idempotente) antes de que arranque el backend. El backend espera a que `migrate` termine bien, así que cuando `DevSeedService` siembra el usuario administrador las tablas y el catálogo de roles ya existen. Si `migrate` falla, el backend no arranca: mirá `docker logs causas-migrate`.

Con eso quedan arriba:

| Servicio  | URL                    | Notas                              |
|-----------|-------------------------|-------------------------------------|
| Backend   | http://localhost:3000/api/v1 | NestJS, hot-reload                  |
| Frontend  | http://localhost:5173   | Vite, hot-reload                    |
| Adminer   | http://localhost:8080   | Cliente web para la DB — credenciales abajo |
| Swagger UI | http://localhost:8081  | Documentación de la API, con "Try it out" — ver abajo |
| Postgres  | localhost:5432          | Credenciales en `docker/.env`   |

### Entrar a Adminer

En `http://localhost:8080`, con los valores por defecto de `docker/.env.example`:

| Campo | Valor |
|---|---|
| Sistema | `PostgreSQL` |
| Servidor | `postgres` (el nombre del servicio en `docker-compose.yaml`, **no** `localhost`: Adminer corre en la misma red de Docker, no en el host) |
| Usuario | `causas-dev` (`POSTGRES_USER`) |
| Contraseña | `causas-dev` (`POSTGRES_PASSWORD`) |
| Base de datos | `causas-dev` (`POSTGRES_DB`) |

Si conectás con un cliente en el host (DBeaver, psql, TablePlus, etc.) en cambio usá `localhost:5432` con esas mismas credenciales — el puerto está publicado en el `docker-compose.yaml`.

### Documentación de la API (Swagger)

Swagger UI queda en **`http://localhost:8081`**. No confundir con Adminer, que usa el `8080`: dentro del contenedor Swagger también escucha en el `8080`, pero el compose lo publica en el `8081` del host (`8081:8080`).

Lo levantan dos servicios del compose:

| Servicio | Qué hace |
|---|---|
| `openapi-build` | Valida el spec modular de [`docs/openapi/`](docs/openapi/) (Redocly + Spectral), arma el bundle en `build/openapi.yaml` y termina. Imagen de `tooling/openapi/`. |
| `openapi-docs` | Swagger UI (`swaggerapi/swagger-ui`) sirviendo ese bundle. Arranca solo si `openapi-build` terminó bien. |

Si el spec tiene errores, `openapi-build` falla y Swagger no arranca: mirá `docker logs causas-openapi-build`.

**Probar endpoints ("Try it out").** Las peticiones van al backend real en `http://localhost:3000/api/v1` (los mocks del frontend no aplican acá):

1. Ejecutá `POST /auth/login` con un usuario del backend real — ver §4 (por ejemplo `admin` / `admin123`).
2. Copiá el `accessToken` de la respuesta, tocá **Authorize** y pegalo en `bearerAuth`.
3. El token queda guardado al recargar la página. La cookie del refresh también viaja, así que `POST /auth/refresh` funciona desde la UI.

Para que el navegador deje pasar esas peticiones, `CORS_ALLOWED_ORIGINS` tiene que incluir `http://localhost:8081` (ya viene en `docker/.env.example`). Si cambiás esa variable, reiniciá el backend con `make backend-restart`.

**Después de editar el spec**, regeneralo con `make openapi-build` y recargá la página: no hace falta reiniciar `openapi-docs`.

El build deja además `build/index.html`, una versión de solo lectura (Redoc) con el spec embebido. Se abre con doble clic, sin servidor, y sirve para leer el contrato o compartirlo con quien no va a probar endpoints. `build/` está en el `.gitignore`: se regenera, no se commitea.

Verificar que todo esté sano:

```bash
make ps
```

## 4. Iniciar sesión

El login es `POST /auth/login` con `{ "username": "...", "password": "..." }`. Qué credenciales sirven depende de si el frontend tiene los mocks prendidos (`VITE_USE_MOCKS`, por defecto `true`):

- **Con mocks (`VITE_USE_MOCKS=true`, el default)**: el frontend no llama al backend real, así que el usuario `DEV_SEED_USERNAME`/`DEV_SEED_PASSWORD` sembrado en la base **no sirve para entrar por la UI**. Los usuarios válidos son los que trae el mock (`fvazquez` / `password1` como administrador, y varios más) — ver el detalle completo en [`frontend/src/shared/mocks/README.md`](frontend/src/shared/mocks/README.md#usuarios-de-prueba).
- **Contra el backend real (`VITE_USE_MOCKS=false`)**, o pegándole directo a `http://localhost:3000/api/v1/auth/login`, en una base recién levantada existen:
  - El administrador que crea `DevSeedService`: por defecto `admin` / `admin123` (`DEV_SEED_USERNAME` / `DEV_SEED_PASSWORD` en `docker/.env`).
  - Los 12 usuarios de prueba que crea el seed (`f.vazquez`, `l.zarate`, `c.pereyra`, …), con distintos roles (`ADMINISTRATOR`, `LAWYER`, `SECRETARY`) y la contraseña de `DEV_SEED_PASSWORD`. La lista completa está en `DEV_USERS` de [`backend/prisma/seed.ts`](backend/prisma/seed.ts).
  - Dos cuentas cortas de demostración, con contraseña propia:

    | Usuario | Contraseña | Rol | Para qué |
    |---|---|---|---|
    | `abogado` | `abogado123` | `LAWYER` | Es el abogado responsable de las tres causas de ejemplo: puede registrar actos y previsualizar su vencimiento. |
    | `secret` | `secret123` | `SECRETARY` | Registra clientes y causas. Sin ficha de abogado, no puede registrar actos. |

Estos usuarios solo se siembran con `NODE_ENV=development` — nunca en otro entorno, aunque las variables estén seteadas.

## 5. Uso diario (`make <comando>`)

Ver la lista completa y actualizada en cualquier momento con:

```bash
make help
```

Comandos más usados:

| Comando | Qué hace |
|---|---|
| `make dev-up` | Levanta los contenedores (sin rebuildear) |
| `make dev-build` | Rebuildea imágenes y levanta todo, con `node_modules` nuevo |
| `make dev-stop` | Frena los contenedores sin borrarlos (`make dev-up` los retoma) |
| `make dev-down` | Frena y elimina los contenedores (los datos de la DB se conservan) |
| `make dev-down-v` | Baja los contenedores y borra los volúmenes (reset total de la DB) |
| `make dev-logs` | Logs de todos los servicios |
| `make ps` | Estado de los contenedores |
| `make clean` | Baja todo, borra volúmenes y contenedores/imágenes huérfanas |
| `make backend-logs` / `make frontend-logs` | Logs de un servicio puntual |
| `make backend-shell` / `make frontend-shell` | Abre una shell dentro del contenedor |
| `make backend-restart` / `make frontend-restart` | Reinicia un servicio puntual |
| `make backend-build` / `make frontend-build` | Rebuildea la imagen de un servicio puntual y lo recrea con `node_modules` nuevo |
| `make migrate-dev` | Corre `prisma migrate dev` (crea y aplica migraciones nuevas, interactivo) |
| `make migrate-create name=<nombre>` | Crea una migración sin aplicarla (`--create-only`) |
| `make migrate-deploy` | Aplica migraciones pendientes sin prompts |
| `make seed` | Corre el seed: roles, permisos, jurisdicciones, estados procesales y, en desarrollo, abogados y usuarios de prueba (idempotente — se puede correr de nuevo sin romper nada) |
| `make openapi-build` | Valida `docs/openapi/` y regenera el bundle que muestra Swagger UI (`http://localhost:8081`) |
| `make shell-db` | Abre `psql` contra la DB del contenedor |

Después de bajar una rama con migraciones o seed nuevos de otra persona alcanza con `make dev-up`: el servicio `migrate` los aplica al levantar. Con los contenedores ya arriba, `make migrate-deploy` / `make seed` los aplican sin reiniciar nada.

## 6. Notas

- El seed (`backend/prisma/seed.ts`, automático al levantar o a mano con `make seed`) carga los datos de referencia (**roles, permisos, jurisdicciones y estados procesales**) y, solo en desarrollo, 11 abogados, 12 usuarios de prueba, 5 clientes, 3 calificaciones legales de ejemplo y 3 causas (una por fuero, con 2 actos procesales cada una, a cargo de `abogado`; identificadas por los SAC `90000001` a `90000003`). Las causas de ejemplo se crean una sola vez: si ya existen, la seed no las toca. El **usuario administrador** de desarrollo (`admin`) es un seed aparte, automático: lo crea el propio backend al arrancar (`DevSeedService`), y depende de que el catálogo de roles ya exista — ver §3 y §4.
- Después de un `make dev-down-v` (que borra los volúmenes) la base queda vacía; el siguiente `make dev-up` vuelve a migrar y sembrar todo solo.
- El código de `backend/` y `frontend/` está montado por bind mount, así que los cambios se reflejan sin rebuildear la imagen. Solo hace falta `make backend-build` / `make frontend-build` (o `dev-build`) cuando cambian dependencias (`package.json`) o el `Dockerfile`. Usá esos comandos y no un `docker compose build` suelto: `node_modules` vive en un volumen anónimo que compose reutiliza al recrear el contenedor, y los `make *-build` lo renuevan (`-V`) para que las dependencias nuevas lleguen al contenedor.
- Este setup es solo de desarrollo local; no hay todavía imágenes ni compose de producción.

## 7. Documentación del proyecto

Además de esta guía de setup, `docs/` tiene la documentación de arquitectura y dominio:

| Carpeta / archivo | Contenido |
|---|---|
| [`docs/Api-Contract/API_CONTRACT_V3.md`](docs/Api-Contract/API_CONTRACT_V3.md) | Contrato de la API (Sprint 2): endpoints, request/response, códigos de error y decisiones. `API_CONTRACT_V2.md` queda como registro del Sprint 1. |
| [`docs/openapi/`](docs/openapi/) | El contrato V3 en OpenAPI 3.1, modular: `openapi.yaml` (raíz), `paths/` (un archivo por ruta) y `components/` (schemas, enums, respuestas, parámetros). Es lo que muestra Swagger UI — ver §3. |
| [`docs/Backend-Architecture/ARQUITECTURA_BACKEND_V1.md`](docs/Backend-Architecture/ARQUITECTURA_BACKEND_V1.md) | Arquitectura hexagonal del backend, subsistemas y convenciones. |
| [`docs/Backend-Architecture/MODULO_AUTH.md`](docs/Backend-Architecture/MODULO_AUTH.md) / [`IMPLEMENTACION_AUTH.md`](docs/Backend-Architecture/IMPLEMENTACION_AUTH.md) | Diseño e historial de decisiones del módulo de autenticación (incluye el detalle de todas las variables de entorno). |
| [`docs/Backend-Architecture/USO_PRISMA.md`](docs/Backend-Architecture/USO_PRISMA.md) | Convenciones para trabajar con Prisma en este proyecto. |
| [`docs/Backend-Architecture/AUDITORIA_Y_TRAZABILIDAD.md`](docs/Backend-Architecture/AUDITORIA_Y_TRAZABILIDAD.md) / [`AUDITORY_TRAIL.md`](docs/Backend-Architecture/AUDITORY_TRAIL.md) | Auditoría y trazabilidad de operaciones. |
| [`docs/Frontend-Architecture/ESTRUCTURA.md`](docs/Frontend-Architecture/ESTRUCTURA.md) | Organización de carpetas y capas del frontend. |
| [`docs/Frontend-Architecture/SHARED.md`](docs/Frontend-Architecture/SHARED.md) | Código compartido del frontend (API client, utilidades). |
| [`docs/Frontend-Architecture/TESTING.md`](docs/Frontend-Architecture/TESTING.md) | Estrategia de testing del frontend. |
| [`frontend/src/shared/mocks/README.md`](frontend/src/shared/mocks/README.md) | El mock de la API (MSW): usuarios de prueba, endpoints implementados, cómo forzar cada código de error. |
| [`docs/TRADUCCION_DOMINIO.md`](docs/TRADUCCION_DOMINIO.md) | Glosario de términos de dominio (jurídico) usados en el código. |
