# Migración D-113 — declaración de prescripción por calificación

`schema.prisma` ya tiene los cambios (modelo `Offense`, cinco columnas
opcionales y la relación con `User`). Falta generar la migración y sumarle el
SQL a mano que Prisma no genera. **La corre el equipo** (`USO_PRISMA.md`).

## Antes de empezar

La base de dev tiene que estar sana. Si `causas-migrate` todavía falla por la
migración `20261106132157_client_document_address_lawyer_optional_registration`
(quedó aplicada a medias), primero:

```bash
make dev-down-v
make dev-up
```

Con una migración fallida, `migrate dev` detecta el desvío y ofrece resetear la
base.

## Pasos

1. Generar la migración **sin aplicarla**:

   ```bash
   make migrate-create name=offense_prescription_declaration
   ```

   Prisma escribe en `backend/prisma/migrations/<fecha>_offense_prescription_declaration/migration.sql`
   el `ALTER TABLE "offenses" ADD COLUMN …` de las cinco columnas y la clave
   foránea a `users`. Revisar que no traiga ningún `DROP`.

2. Pegar **al final** de ese `migration.sql`:

   ```sql
   -- ---------------------------------------------------------------------
   -- Hand-written after `--create-only` (D-113).
   -- ---------------------------------------------------------------------

   -- Las causas ya marcadas prescriptas (HU33, antes de D-113) pasan su
   -- declaración a todos sus hechos: en el modelo nuevo, una causa
   -- "Prescripta" tiene todas sus calificaciones declaradas.
   UPDATE "offenses" AS o
   SET "prescription_declared_on"           = c."prescription_date",
       "prescription_resolution"            = c."prescription_resolution",
       "prescription_grounds"               = c."prescription_grounds",
       "prescription_registered_by_user_id" = c."prescription_registered_by_user_id",
       "prescription_registered_at"         = c."prescription_registered_at"
   FROM "cases" AS c
   WHERE c."id" = o."case_id"
     AND c."prescription_date" IS NOT NULL
     AND o."prescription_declared_on" IS NULL;

   -- La declaración de cada hecho se carga entera o no se carga; el
   -- fundamento es lo único opcional. El mismo criterio que en `cases`
   -- (ck_cases_prescription_declaration_complete, D-52).
   ALTER TABLE "offenses"
     ADD CONSTRAINT ck_offenses_prescription_declaration_complete
       CHECK (num_nonnulls("prescription_declared_on", "prescription_resolution",
                           "prescription_registered_by_user_id",
                           "prescription_registered_at") IN (0, 4)),
     ADD CONSTRAINT ck_offenses_prescription_grounds_need_declaration
       CHECK ("prescription_grounds" IS NULL OR "prescription_declared_on" IS NOT NULL);
   ```

3. Aplicarla:

   ```bash
   make migrate-dev
   ```

## Qué hace y qué no

- **Solo suma**: cinco columnas que admiten `NULL`, una clave foránea, dos
  `CHECK` y una copia de datos. No borra ni renombra nada, y no falla con datos
  cargados.
- **La copia** solo toca las calificaciones de las causas que ya estaban
  marcadas prescriptas. En la base de integración (arranca vacía) no hace
  nada: por eso es de revisión manual
  (`tests-d113-prescripcion-por-delito.md`).
- Los tests de integración aplican las migraciones del repo en su propio
  contenedor: hasta que este archivo exista, la suite de integración no ve
  las columnas nuevas.
