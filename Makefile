# ============================================================================
# Makefile — VZ Causas
# Shortcuts to run docker-compose commands for development.
# Execute `make help` to see the list of available commands.
# Qué comando usar en cada situación: README.md §5.
# ============================================================================

.DEFAULT_GOAL := help

# ---- Env and Compose Paths ------------------------------------------------
COMPOSE_BASE  := docker/docker-compose.yaml

ENV_DEV       := docker/.env
ENV_EXAMPLE   := docker/.env.example

DC_DEV  := docker compose -f $(COMPOSE_BASE)  --env-file $(ENV_DEV)

# Con todos los perfiles activos. stop, down y ps sólo ven los servicios de
# los perfiles activos: sin esto, Adminer y Swagger (perfil "tools") quedarían
# corriendo después de un dev-stop o un nuke.
DC_ALL  := $(DC_DEV) --profile "*"

# Loads variables from .env.dev as Make variables (for targets like shell-db).
# The "-" before include prevents failure if the file doesn't exist yet.
-include $(ENV_DEV)
export

.PHONY: help \
        dev-env dev-up dev-build dev-stop dev-logs ps nuke nuke-v \
        deps backend-deps frontend-deps \
        backend-up backend-restart backend-logs backend-shell \
        frontend-up frontend-restart frontend-logs frontend-shell \
        migrate-deploy migrate-dev migrate-create seed populate db-reset shell-db \
        test-unit test-int setup-storage \
        tools-up tools-stop openapi-build

# help y dev-env necesitan un shell de verdad (grep, sed, awk, `[ -f ]`). En
# Windows, make usa sh si lo encuentra en el PATH (Git Bash) y, si no
# (PowerShell, cmd), corre las recetas con cmd.exe y deja SHELL en "sh.exe"
# literal. En ese caso los dos targets usan PowerShell. Se mira el shell y no
# el sistema operativo: bajo Git Bash, sh rompería los $_ de PowerShell.
# Sólo una de las dos ramas lleva "##", para que help no se liste dos veces.
ifeq ($(SHELL),sh.exe)

help:
	@powershell -NoProfile -Command "Write-Host; Write-Host 'Usage: make <command>'; Write-Host; Select-String -Path Makefile -Pattern '^([a-zA-Z0-9_-]+):\s*##\s*(.*)$$' | ForEach-Object { $$g = $$_.Matches[0].Groups; Write-Host ('  ' + $$g[1].Value.PadRight(20)) -ForegroundColor Cyan -NoNewline; Write-Host (' ' + $$g[2].Value) }; Write-Host"

dev-env:
	@powershell -NoProfile -Command "if ((Test-Path '$(ENV_DEV)') -and ('$(FORCE)' -ne '1')) { Write-Host '$(ENV_DEV) already exists, left untouched. To replace it: make dev-env FORCE=1 (backs it up to $(ENV_DEV).bak).' } else { if (Test-Path '$(ENV_DEV)') { Copy-Item '$(ENV_DEV)' '$(ENV_DEV).bak'; Write-Host 'Backed up the previous one to $(ENV_DEV).bak' }; Copy-Item '$(ENV_EXAMPLE)' '$(ENV_DEV)'; Write-Host 'Created $(ENV_DEV) from $(ENV_EXAMPLE). Fill in the values the example leaves empty.' }"

else

help: ## Shows this list of commands
	@echo ""
	@echo "Usage: make <command>"
	@echo ""
	@grep -E '^[a-zA-Z0-9_-]+:[[:space:]]*##' Makefile | \
		sed 's/:.*##[[:space:]]*/ /' | \
		awk '{printf "  \033[36m%-20s\033[0m %s\n", $$1, substr($$0, index($$0,$$2))}'
	@echo ""

# Never overwrites an existing docker/.env silently: it holds the secrets.
# With FORCE=1 it replaces it, keeping the old one as docker/.env.bak
# (ignored by git through the `.env.*` rule).
dev-env: ## Creates docker/.env from docker/.env.example (FORCE=1 overwrites, backing up to docker/.env.bak)
	@if [ -f $(ENV_DEV) ] && [ "$(FORCE)" != "1" ]; then \
		echo "$(ENV_DEV) already exists, left untouched. To replace it: make dev-env FORCE=1 (backs it up to $(ENV_DEV).bak)."; \
	else \
		if [ -f $(ENV_DEV) ]; then cp $(ENV_DEV) $(ENV_DEV).bak && echo "Backed up the previous one to $(ENV_DEV).bak"; fi; \
		cp $(ENV_EXAMPLE) $(ENV_DEV) && echo "Created $(ENV_DEV) from $(ENV_EXAMPLE). Fill in the values the example leaves empty."; \
	fi

endif

# ---- Environment Wide -----------------------------------------------------

dev-up: ## Starts postgres, migrate, backend and frontend (detached). Adminer and Swagger: make tools-up
	$(DC_DEV) up -d

# -V (--renew-anon-volumes): node_modules lives in an anonymous volume that
# compose reuses when recreating a container, so without it the new image's
# dependencies never reach the container. Also resets the dist volume (cold
# first compile). Named volumes (the DB) are not affected.
dev-build: ## First setup: builds the images and starts everything (fresh node_modules)
	$(DC_DEV) up -d --build -V

dev-stop: ## Stops every container, tools included, without deleting anything (make dev-up resumes)
	$(DC_ALL) stop

dev-logs: ## Follows logs from all services (dev)
	$(DC_DEV) logs -f

ps: ## Shows the status of containers, tools included
	$(DC_ALL) ps

# Nombres agresivos a propósito: no hacen falta en el día a día. Para frenar,
# dev-stop; para una base limpia, db-reset; para dependencias nuevas, deps.
nuke: ## Deletes every container (the DB is kept). Not for daily use: make dev-stop
	$(DC_ALL) down --remove-orphans

nuke-v: ## DELETES the containers AND the volumes: the whole local DB. For a clean DB use make db-reset
	$(DC_ALL) down -v --remove-orphans

# ---- Dependencies ---------------------------------------------------------

# El build sólo vuelve a correr npm ci si cambió package*.json: si no, sale
# de la caché en segundos. -V renueva el volumen anónimo de node_modules: sin
# eso compose lo reutiliza y las dependencias nuevas no llegan al contenedor
# (ver dev-build). migrate comparte la imagen del backend.
deps: ## Reinstalls dependencies of backend and frontend (after a package-lock.json change)
	$(DC_DEV) up -d --build -V backend migrate frontend

backend-deps: ## Reinstalls backend dependencies only (also migrate, which shares the image)
	$(DC_DEV) up -d --build -V backend migrate

frontend-deps: ## Reinstalls frontend dependencies only
	$(DC_DEV) up -d --build -V --no-deps frontend

# --- Backend Scoped --------------------------------------------------------

backend-up: ## Starts only the backend (with postgres and migrate, which it needs)
	$(DC_DEV) up -d backend

# restart no aplica cambios del compose (variables, volúmenes): para eso,
# backend-up.
backend-restart: ## Restarts only backend (does not apply docker-compose.yaml changes: make backend-up)
	$(DC_DEV) restart backend

backend-logs: ## Shows only the backend logs
	$(DC_DEV) logs -f backend

backend-shell: ## Opens a shell inside the backend container (dev)
	$(DC_DEV) exec backend sh

test-unit: ## Runs backend unit tests inside the backend container (dev)
	$(DC_DEV) exec backend npm run test

test-int: ## Runs backend integration tests inside the backend container (dev). No SUITE: all of them, loading the app once. SUITE=<pattern>: only those files
ifeq ($(strip $(SUITE)),)
	$(DC_DEV) exec backend npm run test:int:all
else
	$(DC_DEV) exec backend npm run test:int -- $(SUITE)
endif

setup-storage: ## Creates the studio's Google Drive folders and registers them (optional: the app does it on startup)
	$(DC_DEV) exec backend npm run documents:setup-storage

# ---- Frontend Scoped ------------------------------------------------------

# --no-deps: sin esperar al backend. Alcanza para trabajar con los mocks
# (VITE_USE_MOCKS=true); contra el backend real, levantalo con backend-up.
frontend-up: ## Starts only the frontend, without the backend (enough with mocks)
	$(DC_DEV) up -d --no-deps frontend

frontend-restart: ## Restarts only frontend (does not apply docker-compose.yaml changes: make frontend-up)
	$(DC_DEV) restart frontend

frontend-logs: ## Shows only the frontend logs
	$(DC_DEV) logs -f frontend

frontend-shell: ## Opens a shell inside the frontend container
	$(DC_DEV) exec frontend sh

# ---- Database Scoped ------------------------------------------------------

migrate-deploy: ## Runs pending Prisma migrations without prompts (dev)
	$(DC_DEV) exec backend npm run prisma:migrate-deploy

migrate-dev: ## Runs Prisma migrations inside the backend container (dev)
	$(DC_DEV) exec backend npm run prisma:migrate-dev
	$(DC_DEV) exec backend npm run prisma:generate

migrate-create: ## Create Prisma migration inside the backend container (dev)
	$(DC_DEV) exec backend npx prisma migrate dev --create-only --name $(name)

seed: ## Runs the essential Prisma seed inside the backend container (dev)
	$(DC_DEV) exec backend npx prisma db seed

populate: ## Populates the dev database with sample data (prisma/populate/populate.ts), after seed
	$(DC_DEV) exec backend npm run prisma:populate

db-reset: ## Empties the DB, reapplies migrations and the essential seed. Sample data after it: make populate
	$(DC_DEV) exec backend npx prisma migrate reset --force
	$(DC_DEV) exec backend npx prisma db seed
	$(DC_DEV) restart backend

shell-db: ## Opens psql inside the postgres container (dev)
	$(DC_DEV) exec postgres psql -U $(POSTGRES_USER) -d $(POSTGRES_DB)

# ---- Tools (profile "tools") ----------------------------------------------

# Adminer y Swagger no arrancan con dev-up: están en el perfil "tools".
# openapi-docs espera a que openapi-build arme el bundle.
tools-up: ## Starts Adminer (localhost:8080) and Swagger UI (localhost:8081)
	$(DC_DEV) --profile tools up -d adminer openapi-docs

tools-stop: ## Stops Adminer and Swagger UI
	$(DC_DEV) --profile tools stop adminer openapi-docs

# Swagger UI (openapi-docs) lee el bundle en cada recarga: alcanza con
# regenerarlo y refrescar http://localhost:8081.
openapi-build: ## Validates docs/openapi and regenerates build/openapi.yaml
	$(DC_DEV) --profile tools up --build openapi-build
