# Migraciones de base de datos con Prisma

Este documento explica cómo gestionamos el esquema de la base de datos PostgreSQL en este proyecto usando Prisma Migrate, y cómo usar los comandos de Make para correr las migraciones sin tener que entrar manualmente a la shell del contenedor.

## 1. Por qué usamos esta metodología

Prisma Migrate nos permite **versionar el esquema de la base de datos** de la misma forma en que versionamos el código. Cada cambio en la base de datos (tablas nuevas, columnas, enums, triggers, etc.) se guarda como un archivo SQL dentro de `prisma/migrations/`. Esto nos da:

- Un historial claro de cada cambio realizado en la base de datos.
- El mismo esquema en todos los entornos (local, staging, producción).
- La posibilidad de revisar los cambios de base de datos en los pull requests, igual que cualquier otro cambio de código.

Prisma puede generar el SQL automáticamente para todo lo que declaramos en `schema.prisma` (tablas, columnas, relaciones, enums). Sin embargo, Prisma **no puede** generar SQL para cosas como triggers, funciones o extensiones de PostgreSQL, porque no forman parte de su lenguaje de esquema. Para esos casos, creamos una migración vacía y escribimos el SQL a mano. Este es el enfoque estándar que recomienda el propio equipo de Prisma.

## 2. Dos formas de correr las migraciones

| Comando           | Cuándo usarlo              | Comportamiento                                                                                          |
| ------------------ | --------------------------- | --------------------------------------------------------------------------------------------------------- |
| `migrate dev`     | Desarrollo local            | Interactivo. Puede detectar drift (desvíos) en el esquema y pedir confirmación para resetear la base. Genera el Prisma Client. |
| `migrate deploy`  | Staging / Producción / CI   | No interactivo. Solo aplica las migraciones pendientes. Nunca resetea ni modifica migraciones existentes. |

Nunca corremos `migrate dev` en producción ni en un pipeline automatizado, porque puede resetear datos si detecta una inconsistencia. `migrate deploy` es siempre la opción segura para entornos automatizados.

## 3. Paso a paso: actualizar la base de datos

### Paso 1 — Actualizar el esquema

Abrí `prisma/schema.prisma` y agregá o modificá un modelo, campo o enum.

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

### Paso 2 — Crear la migración

Si el cambio involucra solo cosas que Prisma entiende (modelos, campos, enums), creá y aplicá la migración directamente:

```
make migrate-dev
```

Esto ejecuta `prisma migrate dev` dentro del contenedor del backend, lo cual:

1. Compara tu esquema contra el estado actual de la base de datos.
2. Genera el archivo SQL automáticamente.
3. Lo aplica a la base de datos.
4. Regenera el Prisma Client.

### Paso 3 — Agregar SQL manual (triggers, funciones, extensiones)

Si necesitás algo que Prisma no puede generar por sí solo (un trigger, una función de PostgreSQL, una extensión, o un `ALTER TYPE` manual), creá la migración **sin aplicarla**:

```
make migrate-create name=add_updated_at_trigger
```

Esto crea una carpeta de migración vacía dentro de `prisma/migrations/`. Abrí el archivo `migration.sql` generado y agregá tu SQL manual, por ejemplo:

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

Después aplicala corriendo:

```
make migrate-dev
```

### Paso 4 — Desplegar en staging o producción

En cualquier entorno que no sea desarrollo, las migraciones se aplican con:

```
make migrate-deploy
```

Esto solo aplica las migraciones que todavía no fueron aplicadas. No hace preguntas ni resetea la base de datos.

## 4. Reglas importantes

- **Nunca edites un archivo de migración que ya fue aplicado y compartido con el equipo.** Prisma guarda un checksum de cada migración en la tabla `_prisma_migrations`. Si el archivo cambia después de haber sido aplicado, Prisma va a detectar la inconsistencia y va a fallar. Si necesitás corregir algo, creá una nueva migración en su lugar.
- **Mantené el orden de las migraciones consistente.** Las migraciones se ejecutan en el orden de los timestamps de sus carpetas. Si un trigger depende de una tabla, asegurate de que la migración del trigger haya sido creada después de la migración de esa tabla.
- **Los enums declarados en el esquema se manejan automáticamente.** Solo necesitás escribir SQL manual cuando agregás un valor a un enum _ya existente_ (`ALTER TYPE ... ADD VALUE`), porque PostgreSQL no permite ejecutar esto dentro de la misma transacción que otras sentencias que usen ese tipo.

## 5. Referencia de comandos de Make

```makefile
migrate-deploy: ## Corre las migraciones de Prisma dentro del contenedor del backend (deploy/prod)
	$(DC_DEV) exec backend npm run prisma:migrate-deploy

migrate-dev: ## Corre las migraciones de Prisma dentro del contenedor del backend (dev)
	$(DC_DEV) exec backend npm run prisma:migrate-dev

migrate-create: ## Crea una migración de Prisma dentro del contenedor del backend (dev)
	$(DC_DEV) exec backend npx prisma migrate dev --create-only --name $(name)
```

| Comando                                      | Descripción                                                                                                                    |
| --------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------- |
| `make migrate-dev`                          | Aplica todas las migraciones pendientes en la base de datos local. Usalo después de traer cambios de otros desarrolladores, o después de crear una migración nueva. |
| `make migrate-create name=<nombre_migracion>` | Crea un archivo de migración vacío sin aplicarlo. Usalo cuando necesites escribir SQL a mano (triggers, funciones, extensiones, cambios manuales de enums). |
| `make migrate-deploy`                       | Aplica las migraciones pendientes de forma no interactiva. Usalo en staging, producción o en pipelines de CI/CD.                |

Los tres comandos se ejecutan **dentro del contenedor del backend**, así que no hace falta abrir una shell manualmente ni instalar Prisma localmente en tu máquina. El contenedor del backend tiene que estar corriendo (`docker compose up`) antes de usar `migrate-dev` o `migrate-create`, ya que estos comandos dependen de `docker compose exec`.

## 6. Ejemplo de flujo de trabajo típico

```
# 1. Editá prisma/schema.prisma o escribí el SQL que necesites

# 2. Si es un cambio que solo afecta al esquema:
make migrate-dev

# 3. Si necesita SQL manual:
make migrate-create name=add_order_status_trigger
# → editá el archivo migration.sql generado
make migrate-dev

# 4. Al desplegar:
make migrate-deploy
```
