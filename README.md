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

Ese archivo trae credenciales de desarrollo ya cargadas (`POSTGRES_USER`, `POSTGRES_PASSWORD`, `POSTGRES_DB`, `JWT_SECRET`, `JWT_REFRESH_SECRET`, etc.) y **no se commitea** (está en `.gitignore`). Para desarrollo local los valores por defecto sirven tal cual; si vas a exponer el entorno a algo más que tu máquina, cambiá los secretos.

> `backend/.env.example` solo es necesario si corrés el backend **fuera** de Docker (`npm run start:dev` directo en el host). El flujo recomendado (`make dev-up`) no lo usa.

## 3. Primer levantamiento

```bash
make dev-build     # build de las imágenes + levanta todo en segundo plano
make migrate-deploy  # aplica las migraciones de Prisma sobre la DB
```

Con eso quedan arriba:

| Servicio  | URL                    | Notas                              |
|-----------|-------------------------|-------------------------------------|
| Backend   | http://localhost:3000/api/v1 | NestJS, hot-reload                  |
| Frontend  | http://localhost:5173   | Vite, hot-reload                    |
| Adminer   | http://localhost:8080   | Cliente web para la DB              |
| Postgres  | localhost:5432          | Ver credenciales en `docker/.env`   |

Verificar que todo esté sano:

```bash
make ps
```

## 4. Uso diario (`make <comando>`)

Ver la lista completa y actualizada en cualquier momento con:

```bash
make help
```

Comandos más usados:

| Comando | Qué hace |
|---|---|
| `make dev-up` | Levanta los contenedores (sin rebuildear) |
| `make dev-build` | Rebuildea imágenes y levanta todo |
| `make dev-down` | Baja los contenedores |
| `make dev-down-v` | Baja los contenedores y borra los volúmenes (reset total de la DB) |
| `make dev-logs` | Logs de todos los servicios |
| `make ps` | Estado de los contenedores |
| `make clean` | Baja todo, borra volúmenes y contenedores/imágenes huérfanas |
| `make backend-logs` / `make frontend-logs` | Logs de un servicio puntual |
| `make backend-shell` / `make frontend-shell` | Abre una shell dentro del contenedor |
| `make backend-restart` / `make frontend-restart` | Reinicia un servicio puntual |
| `make backend-build` / `make frontend-build` | Rebuildea la imagen de un servicio puntual |
| `make migrate-dev` | Corre `prisma migrate dev` (crea y aplica migraciones nuevas, interactivo) |
| `make migrate-create name=<nombre>` | Crea una migración sin aplicarla (`--create-only`) |
| `make migrate-deploy` | Aplica migraciones pendientes sin prompts |
| `make shell-db` | Abre `psql` contra la DB del contenedor |

Después de bajar una rama con migraciones nuevas de otra persona, correr `make migrate-deploy`.

## 5. Notas

- `make seed` está en el Makefile pero **todavía no hay script de seed definido** en el proyecto Prisma; por ahora no hace nada útil.
- El código de `backend/` y `frontend/` está montado por bind mount, así que los cambios se reflejan sin rebuildear la imagen. Solo hace falta `make backend-build` / `make frontend-build` (o `dev-build`) cuando cambian dependencias (`package.json`) o el `Dockerfile`.
- Este setup es solo de desarrollo local; no hay todavía imágenes ni compose de producción.
