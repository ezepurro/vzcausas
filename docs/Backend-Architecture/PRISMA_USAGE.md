# Database Migrations with Prisma

This document explains how we manage the PostgreSQL database schema in this project using Prisma Migrate, and how to use the Make commands to run migrations without entering the container shell manually.

## 1. Why we use this methodology

Prisma Migrate lets us **version the database schema** the same way we version code. Every change to the database (new tables, columns, enums, triggers, etc.) is saved as a SQL file inside `prisma/migrations/`. This gives us:

- A clear history of every change made to the database.
- The same schema across all environments (local, staging, production).
- The ability to review database changes in pull requests, just like any other code change.

Prisma can generate SQL automatically for things declared in `schema.prisma` (tables, columns, relations, enums). However, Prisma **cannot** generate SQL for things like triggers, functions, or PostgreSQL extensions, because these are not part of its schema language. For these cases, we create an empty migration and write the SQL by hand. This is the standard approach recommended by Prisma itself.

## 2. Two ways to run migrations

| Command          | When to use it            | Behavior                                                                                         |
| ---------------- | ------------------------- | ------------------------------------------------------------------------------------------------ |
| `migrate dev`    | Local development         | Interactive. Can detect schema drift and ask to reset the database. Generates the Prisma Client. |
| `migrate deploy` | Staging / Production / CI | Non-interactive. Only applies pending migrations. Never resets or modifies existing migrations.  |

We never run `migrate dev` in production or in an automated pipeline, because it can reset data if it detects an inconsistency. `migrate deploy` is always the safe choice for automated environments.

## 3. Step-by-step: updating the database

### Step 1 — Update the schema

Open `prisma/schema.prisma` and add or modify a model, field, or enum.

```prisma
model Order {
  id     String      @id @default(uuid())
  status OrderStatus @default(PENDING)
}

enum OrderStatus {
  PENDING
  PAID
  SHIPPED
}
```

### Step 2 — Create the migration

If the change only involves things Prisma understands (models, fields, enums), create and apply the migration directly:

```
make migrate-dev
```

This runs `prisma migrate dev` inside the backend container, which:

1. Compares your schema against the current database state.
2. Generates the SQL file automatically.
3. Applies it to the database.
4. Regenerates the Prisma Client.

### Step 3 — Add custom SQL (triggers, functions, extensions)

If you need something Prisma cannot generate on its own (a trigger, a PostgreSQL function, an extension, or a manual `ALTER TYPE`), create the migration **without applying it**:

```
make migrate-create name=add_updated_at_trigger
```

This creates an empty migration folder inside `prisma/migrations/`. Open the generated `migration.sql` file and add your raw SQL, for example:

```sql
CREATE OR REPLACE FUNCTION set_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW."updatedAt" = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_orders_updated_at
BEFORE UPDATE ON "Order"
FOR EACH ROW
EXECUTE FUNCTION set_updated_at();
```

Then apply it by running:

```
make migrate-dev
```

### Step 4 — Deploying to staging or production

In any non-development environment, migrations are applied with:

```
make migrate-deploy
```

This only applies migrations that have not been applied yet. It does not ask questions and it does not reset the database.

## 4. Important rules

- **Never edit a migration file that has already been applied and shared with the team.** Prisma stores a checksum of every migration in the `_prisma_migrations` table. If the file changes after being applied, Prisma will detect a mismatch and fail. If you need to fix something, create a new migration instead.
- **Keep the migration order consistent.** Migrations run in the order of their folder timestamps. If a trigger depends on a table, make sure the trigger's migration was created after the table's migration.
- **Enums declared in the schema are handled automatically.** You only need manual SQL when adding a value to an _existing_ enum (`ALTER TYPE ... ADD VALUE`), because PostgreSQL does not allow this inside the same transaction as other statements using that type.

## 5. Make commands reference

```makefile
migrate-deploy: ## Runs Prisma migrations inside the backend container (deploy/prod)
	$(DC_DEV) exec backend npm run prisma:migrate-deploy

migrate-dev: ## Runs Prisma migrations inside the backend container (dev)
	$(DC_DEV) exec backend npm run prisma:migrate-dev

migrate-create: ## Create Prisma migration inside the backend container (dev)
	$(DC_DEV) exec backend npx prisma migrate dev --create-only --name $(name)
```

| Command                                     | Description                                                                                                                                                        |
| ------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| `make migrate-dev`                          | Applies all pending migrations in the local database. Use this after pulling changes from other developers, or after creating a new migration.                     |
| `make migrate-create name=<migration_name>` | Creates a new empty migration file without applying it. Use this when you need to write custom SQL by hand (triggers, functions, extensions, manual enum changes). |
| `make migrate-deploy`                       | Applies pending migrations in a non-interactive way. Use this in staging, production, or CI/CD pipelines.                                                          |

All three commands run **inside the backend container**, so you don't need to open a shell manually or install Prisma locally on your machine. The backend container must already be running (`docker compose up`) before using `migrate-dev` or `migrate-create`, since these commands rely on `docker compose exec`.

## 6. Typical workflow example

```
# 1. Edit prisma/schema.prisma or write your own SQL need

# 2. If it's a schema-only change:
make migrate-dev

# 3. If it needs custom SQL:
make migrate-create name=add_order_status_trigger
# → edit the generated migration.sql file
make migrate-dev

# 4. When deploying:
make migrate-deploy
```
