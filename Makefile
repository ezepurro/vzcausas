# ============================================================================
# Makefile — VZ Causas
# Shortcuts to run docker-compose commands for development.
# Execute `make help` to see the list of available commands.
# ============================================================================

.DEFAULT_GOAL := help

# ---- Env and Compose Paths ------------------------------------------------
COMPOSE_BASE  := docker/docker-compose.yaml

ENV_DEV       := docker/.env

DC_DEV  := docker compose -f $(COMPOSE_BASE)  --env-file $(ENV_DEV)

# Loads variables from .env.dev as Make variables (for targets like shell-db).
# The "-" before include prevents failure if the file doesn't exist yet.
-include $(ENV_DEV)
export

.PHONY: help \
        dev-up dev-build dev-down dev-down-v dev-logs ps clean \
        backend-restart backend-logs backend-shell backend-build \
        migrate seed test-int \
        frontend-restart frontend-logs frontend-shell frontend-build \
        shell-db

help: ## Shows this list of commands
	@echo ""
	@echo "Usage: make <command>"
	@echo ""
	@grep -E '^[a-zA-Z0-9_-]+:[[:space:]]*##' Makefile | \
		sed 's/:.*##[[:space:]]*/ /' | \
		awk '{printf "  \033[36m%-20s\033[0m %s\n", $$1, substr($$0, index($$0,$$2))}'
	@echo ""

# ---- Environment Wide -----------------------------------------------------

dev-up: ## Starts all services in development mode (detached)
	$(DC_DEV) up -d

dev-build: ## Rebuilds images and starts development
	$(DC_DEV) up -d --build

dev-down: ## Stops development containers
	$(DC_DEV) down

dev-down-v: ## Stops development and removes volumes (complete local DB reset)
	$(DC_DEV) down -v

dev-logs: ## Follows logs from all services (dev)
	$(DC_DEV) logs -f

ps: ## Shows the status of containers (dev)
	$(DC_DEV) ps

clean: ## Stops everything, removes volumes and orphaned images/containers (dev)
	$(DC_DEV) down -v --remove-orphans

# --- Backend Scoped --------------------------------------------------------

backend-restart: ## Restarts only backend (dev)
	$(DC_DEV) restart backend

backend-logs: ## Shows only the backend logs
	$(DC_DEV) logs -f backend

backend-shell: ## Opens a shell inside the backend container (dev)
	$(DC_DEV) exec backend sh

backend-build: ## Rebuild the backend image only
	$(DC_DEV) build backend

migrate-deploy: ## Runs pending Prisma migrations without prompts (dev)
	$(DC_DEV) exec backend npm run prisma:migrate-deploy

migrate-dev: ## Runs Prisma migrations inside the backend container (dev)
	$(DC_DEV) exec backend npm run prisma:migrate-dev
	$(DC_DEV) exec backend npm run prisma:generate
	
migrate-create: ## Create Prisma migration inside the backend container (dev)
	$(DC_DEV) exec backend npx prisma migrate dev --create-only --name $(name)

seed: ## Runs Prisma seed inside the backend container (dev)
	$(DC_DEV) exec backend npx prisma db seed

test-int: ## Runs backend integration tests inside the backend container (dev)
	$(DC_DEV) exec backend npm run test:int

# ---- Frontend Scoped ------------------------------------------------------

frontend-restart: ## Restarts only frontend (dev)
	$(DC_DEV) restart frontend

frontend-logs: ## Shows only the frontend logs
	$(DC_DEV) logs -f frontend

frontend-shell: ## Opens a shell inside the frontend container
	$(DC_DEV) exec frontend sh

frontend-build: ## Rebuild the frontend image only
	$(DC_DEV) build frontend

# ---- Database Scoped ------------------------------------------------------

shell-db: ## Opens psql inside the postgres container (dev)
	$(DC_DEV) exec postgres psql -U $(POSTGRES_USER) -d $(POSTGRES_DB)
