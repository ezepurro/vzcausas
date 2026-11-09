# Cambios en la base de datos — Sprint 4

Cambios en la base de datos para dar soporte al Sprint 4 ("VZ Sprint 4" de
Jira, 25/10/2026 – 06/11/2026: HU14, HU19, HU21, HU23, HU24, HU25, HU28 y
HU38), según `API_CONTRACT_V5.md` y `DECISIONES.md` (rama `develop`, último
cambio del 28/10/2026). Parte del esquema del Sprint 3
(`cambios-bdd-sprint3.md` y las migraciones hasta
`20261018162502_sent_notifications_recipient`).

> **Estado (31/10/2026):** `backend/prisma/schema.prisma` **modificado**. La
> migración **no está creada**: la crea el equipo siguiendo la
> [§8](#8-cómo-crear-la-migración), con el SQL manual de la
> [§9](#9-sql-manual-sprint4_manual_constraints). No se generó el cliente de
> Prisma ni se tocó ninguna base del equipo.

## Resumen

| HU | Qué necesita de la base | Cambio |
|---|---|---|
| HU14 · Modificar abogado | Auditoría de la modificación (CA-14.5) | Tabla `audit_log` |
| HU19 · Modificar causa | SAC único entre vigentes (CA-19.5), auditoría (CA-19.15), carpeta que sigue a la causa (CA-19.9) | Índice parcial del SAC, `audit_log`; `cloud_folders` sin columnas nuevas |
| HU21 · Baja de causa | Motivo, usuario y fecha (CA-21.2, CA-21.3), SAC liberado (CA-21.7) | Columnas de baja en `cases`, índice parcial del SAC, `audit_log` |
| HU23 · Descargar modelo formal | — | Ninguno (`document_templates.cloud_file_id` ya existe) |
| HU24 · Carátula | — | Ninguno: la carátula no se guarda (D-91, D-92, D-94) |
| HU25 · Expediente | Versión correlativa que no se reutiliza (CA-25.6), `generatedBy`/`generatedAt` (CA-25.9) | Tabla `case_files` |
| HU28 · Modificar acto procesal | `lastModifiedBy` y `lastModifiedAt` (CA-28.10) | Columnas en `procedural_acts` |
| HU38 · Documentos de la causa | Reconocer qué archivo es un expediente (`caseFile`, CA-38.4) | Usa `case_files`; la lista se lee de Drive (D-100) |

---

## Decisiones de diseño

- **El SAC es único entre las causas vigentes (D-97).** La baja lo libera y la
  causa dada de baja lo conserva en `sac_number`. Se impone con un **índice
  único parcial** (`WHERE active AND sac_number IS NOT NULL`), elegido por el
  equipo el 31/10/2026. Se evaluaron y descartaron:
  - *Reactivar la causa dada de baja al registrar su SAC:* trae de vuelta el
    fuero equivocado —que es el motivo real para dar de baja y registrar de
    nuevo (D-95)—, arrastra actos, estado, prescripción y carpeta de un
    registro mal cargado, sobrescribe la historia (RN12) y contradice CA-21.4
    ("No hay reactivación por la API").
  - *Mover el SAC a otra columna al dar de baja:* válido, pero se prefirió
    respetar D-97 tal como está en el contrato.
- **Por qué índice y no `CHECK`.** Un `CHECK` solo ve la fila que se guarda;
  la unicidad depende de las demás filas. Postgres no admite subconsultas en un
  `CHECK`, y una función que consulte la tabla no resiste dos altas
  simultáneas. El `UNIQUE` como *constraint* no admite `WHERE`: la unicidad
  parcial solo se expresa con `CREATE UNIQUE INDEX ... WHERE`.
- **El motivo de la baja va en la causa, no en la auditoría.** Es texto libre y
  puede tener datos sensibles; `AUDITORIA_Y_TRAZABILIDAD.md` §4 prohíbe eso en
  `metadata`. En `cases` queda con la misma protección que el resto de la causa.
- **La numeración de expedientes la lleva la base.** Borrar un expediente en
  Drive no libera su número, así que no se puede derivar de la carpeta. La fila
  se inserta **después** de que Drive guardó el archivo: un fallo no consume el
  número (CA-25.8). Las partes del expediente no se guardan.
- **Una sola tabla de auditoría, transversal y de solo alta.** La escriben los
  casos de uso por `AuditTrailPort`. `metadata` lleva identificadores y los
  **nombres** de los campos que cambiaron, no sus valores. Un trigger rechaza
  `UPDATE`, `DELETE` y `TRUNCATE`, con una purga explícita para los tests.
- **Las carpetas no suman columnas (D-104).** `cloud_folders` refleja siempre
  el nombre y la ubicación **reales** en Drive: se actualiza solo cuando Drive
  confirmó el cambio. El proceso diario detecta los desfasajes comparando lo
  esperado (carátula, responsable, nombre del abogado) con lo guardado.
- **Nombres.** `case_files` en plural, como el resto de las tablas;
  `audit_log` como se acordó.

---

## 1. Tabla `cases`

| Columna | Tipo | Nulo | Origen | Descripción |
|---|---|:-:|---|---|
| `sac_number` | `CHAR(8)` | Sí | S2, **cambia en S4** | Deja de tener `@unique`: único solo entre vigentes (índice parcial `cases_sac_number_active_key`) |
| `deactivated_at` | `TIMESTAMPTZ` | Sí | **S4** | Cuándo se dio de baja. `NULL` si está vigente |
| `deactivated_by_user_id` | `INT` → `users` | Sí | **S4** | Quién la dio de baja. `NULL` si está vigente |
| `deactivation_reason` | `VARCHAR(500)` | Sí | **S4** | Motivo opcional de la baja (CA-21.2) |

`CHECK ck_cases_deactivation_coherent`: vigente ⇒ las tres en `NULL`; dada de
baja ⇒ fecha y autor obligatorios. Revertir una baja desde la base exige volver
a `NULL` las tres (y que el SAC no esté en uso por otra causa vigente).

## 2. Tabla `procedural_acts`

| Columna | Tipo | Nulo | Origen | Descripción |
|---|---|:-:|---|---|
| `last_modified_by_user_id` | `INT` → `users` | Sí | **S4** | Quién lo modificó por última vez (HU28, D-98) |
| `last_modified_at` | `TIMESTAMPTZ` | Sí | **S4** | Cuándo. `NULL` las dos si nunca se modificó |

`registered_by_*` y `registered_at` no cambian al modificar (CA-28.10).

## 3. Tabla nueva `case_files` (subsistema `documents`)

| Columna | Tipo | Nulo | Descripción |
|---|---|:-:|---|
| `id` | `SERIAL` | No | Clave primaria. Es el `caseFile.id` de la API |
| `case_id` | `INT` → `cases` | No | Causa |
| `version` | `INT` | No | Desde 1, correlativa por causa. Único con `case_id` |
| `cloud_file_id` | `VARCHAR(128)` | No | Id del PDF en la nube. Único |
| `file_name` | `VARCHAR(255)` | No | `Expediente_{SAC}_v{n}.pdf` o `Expediente_causa-{id}_v{n}.pdf` |
| `page_count` | `INT` | No | Cantidad de hojas (`pageCount`) |
| `generated_by_user_id` | `INT` → `users` | No | `generatedBy` |
| `generated_at` | `TIMESTAMPTZ` | No | `generatedAt` |

Índices: `UNIQUE (case_id, version)` y `UNIQUE (cloud_file_id)`.

## 4. Tabla nueva `audit_log` (transversal)

| Columna | Tipo | Nulo | Descripción |
|---|---|:-:|---|
| `id` | `SERIAL` | No | Clave primaria |
| `actor_user_id` | `INT` → `users` | Sí | Quién. `NULL` solo para el proceso automático diario |
| `action` | `VARCHAR(100)` | No | `case.updated`, `case.deactivated`, `lawyer.updated`… |
| `entity_type` | `VARCHAR(50)` | No | `Case`, `Lawyer`, `ProceduralAct`… |
| `entity_id` | `VARCHAR(128)` | No | Clave de la entidad, como texto |
| `occurred_at` | `TIMESTAMPTZ` | No | Cuándo |
| `metadata` | `JSONB` | Sí | Objeto JSON sin datos sensibles: p. ej. `{"changedFields": ["caption", "court"]}` |
| `correlation_id` | `VARCHAR(128)` | Sí | Id de la petición (`correlation-id.middleware`), para cruzar con el log técnico |

Índices: `(entity_type, entity_id, occurred_at)` y `(actor_user_id, occurred_at)`.
Sin `onDelete: Cascade`: un usuario con auditoría no se borra físicamente.

## 5. Tabla `cloud_folders` — sin columnas nuevas

D-104 reemplaza a D-61: la carpeta `CASE` se renombra (cambia `name`) y se
mueve (cambian `parent_cloud_folder_id` y `lawyer_id`, **en la misma
actualización**, porque `ck_cloud_folders_shape_by_kind` y los índices
parciales de carpetas lo exigen); la `LAWYER` se renombra. La carpeta de fuero
del nuevo responsable se crea si no existe; el índice parcial
`(lawyer_id, jurisdiction_id) WHERE kind = 'JURISDICTION'` evita duplicarla si
dos pedidos la crean a la vez. La baja de la causa no toca su carpeta.

## 6. Sin cambios en la base

- **HU23, HU24:** ver el resumen.
- **HU38:** la lista de documentos no se guarda (D-100); solo se cruza con
  `case_files.cloud_file_id` para informar `caseFile`.
- **HU14 / `lawyers`:** las causas referencian al abogado, no lo copian
  (CA-14.2). La matrícula sigue única en toda la tabla.

---

## 7. Cómo se hizo

1. **Análisis.** Se cruzaron los criterios de aceptación de las 8 historias del
   sprint (Jira), el contrato V5 y `DECISIONES.md` §4 "Impacto de V5" con
   `schema.prisma` y las 14 migraciones. La lista de impacto del contrato no
   incluía la tabla de auditoría, que piden CA-14.5, CA-19.15 y CA-21.3.
2. **Edición de `schema.prisma`:**
   - `User`: relaciones inversas `deactivatedCases`,
     `lastModifiedProceduralActs`, `generatedCaseFiles` y `auditEntries`.
   - `Case`: `sacNumber` sin `@unique` (comentario con el índice parcial),
     `deactivatedAt`, `deactivatedByUserId`, `deactivationReason`, relaciones
     `deactivatedBy` y `caseFiles`; comentario del acto vigente actualizado con
     D-99.
   - `ProceduralAct`: `lastModifiedByUserId`, `lastModifiedAt` y relación
     `lastModifiedBy`.
   - `CloudFolder`: comentario de D-61 reemplazado por la regla de D-104.
   - Modelos nuevos `CaseFile` (sección `documents`) y `AuditLog` (sección
     nueva `audit`).
   - Bloque "SQL manual" del final: entradas del Sprint 4.
3. **Validación del schema** con el motor de esquema de Prisma
   `7.9.0-1.e922089…` (`@prisma/prisma-schema-wasm`, el mismo hash de motor que
   usa `prisma@7.9.1` del proyecto): **válido**. Se aplicó la alineación de
   `prisma format` solo en los bloques modificados; los desalineados previos de
   `Lawyer` y `SentNotification` no se tocaron.
4. **Prueba del SQL manual** sobre Postgres embebido (PGlite): se aplicaron las
   14 migraciones existentes, una aproximación del DDL que generará Prisma para
   `sprint4` y el SQL de la §9. **34 de 34 pruebas correctas**, entre ellas:
   - dos causas vigentes con el mismo SAC → rechazado; con el SAC de una dada
     de baja → permitido; varias sin SAC → permitido;
   - baja sin fecha o sin autor, causa vigente con datos de baja y motivo en
     blanco → rechazados; reactivar por la base con el SAC ya usado → rechazado;
   - modificación de acto con solo uno de los dos campos o anterior al
     registro → rechazada;
   - versión de expediente repetida, versión 0, 0 hojas o mismo archivo en dos
     filas → rechazados; borrar una causa con expedientes → rechazado;
   - `UPDATE`, `DELETE` y `TRUNCATE` sobre `audit_log` → rechazados; `DELETE`
     dentro de una transacción con la purga activa → permitido, y la purga no
     sobrevive al `COMMIT`; `metadata` que no es objeto → rechazado.

## 8. Cómo crear la migración

1. **Comprobación previa** sobre la base donde se va a aplicar:

   ```sql
   SELECT id FROM "cases" WHERE NOT "active";
   ```

   Si devuelve filas, `ck_cases_deactivation_coherent` va a fallar porque esas
   causas no tienen fecha ni autor de la baja. En una base de desarrollo se
   pueden completar (es un dato inventado, solo aceptable ahí):

   ```sql
   UPDATE "cases" SET "deactivated_at" = "updated_at",
                      "deactivated_by_user_id" = "created_by_user_id"
    WHERE NOT "active" AND "deactivated_at" IS NULL;
   ```

   En una base con datos reales no se inventa: se decide con el equipo, o se
   agrega el `CHECK` con `NOT VALID` (valida solo las filas nuevas o
   modificadas).
2. `npx prisma migrate dev --create-only --name sprint4`. Revisar el SQL
   generado:
   - **Debe** traer `DROP INDEX "cases_sac_number_key"` (es el `@unique` que
     se quitó) y la creación de columnas, tablas, índices y claves foráneas.
   - **No debe** traer `DROP INDEX` de los índices parciales existentes
     (`users_lawyer_id_active_key`, `procedural_states_*_key`,
     `legal_qualifications_name_active_key`, `clients_dni_active_key`, los de
     `cloud_folders`, `document_templates`, `sent_notifications_once_key`). Si
     los trae, quitarlos a mano.
3. `npx prisma migrate dev --create-only --name sprint4_manual_constraints` y
   pegar el SQL de la §9.
4. `npx prisma migrate dev` para aplicar las dos, y `npx prisma generate`.
5. Correr los tests de integración (ver los cambios de código de la §10: sin
   ellos, el código actual no compila).

## 9. SQL manual (`sprint4_manual_constraints`)

```sql
-- =====================================================================
-- Sprint 4 — SQL manual: lo que schema.prisma no puede expresar
-- =====================================================================
--
-- Índice único parcial, restricciones CHECK y el trigger de solo alta de
-- la auditoría del diseño del Sprint 4 (docs/support/cambios-bdd-sprint4.md,
-- API Contract V5). Las columnas, tablas, índices comunes y claves
-- foráneas los crea la migración generada `sprint4`, que tiene que ir
-- ANTES que esta.
--
-- Comprobación previa: ck_cases_deactivation_coherent falla si ya hay
-- causas dadas de baja (no tienen fecha ni autor de la baja). Correr
--   SELECT id FROM "cases" WHERE NOT "active";
-- y, si devuelve filas, resolverlas antes (ver el documento, §8).
--
-- ATENCIÓN — deriva: Prisma no conoce los índices parciales. Si una
-- migración generada después trae un DROP INDEX de
-- "cases_sac_number_active_key", hay que quitarlo a mano. Los CHECK y
-- los triggers no generan deriva: Prisma los ignora.
-- =====================================================================


-- ---------------------------------------------------------------------
-- cases — cases
-- ---------------------------------------------------------------------

-- El SAC es único entre las causas VIGENTES (D-97): la baja lo libera y
-- la causa dada de baja lo conserva. Reemplaza a "cases_sac_number_key",
-- que la migración generada borra al quitar el @unique.
CREATE UNIQUE INDEX "cases_sac_number_active_key"
  ON "cases" ("sac_number")
  WHERE "active" = true AND "sac_number" IS NOT NULL;

ALTER TABLE "cases"
  -- Datos de la baja (HU21): vacíos mientras la causa está vigente; con
  -- la baja, cuándo y quién son obligatorios y el motivo es opcional.
  ADD CONSTRAINT ck_cases_deactivation_coherent
    CHECK (
      ("active"
        AND "deactivated_at" IS NULL
        AND "deactivated_by_user_id" IS NULL
        AND "deactivation_reason" IS NULL)
      OR (NOT "active"
        AND "deactivated_at" IS NOT NULL
        AND "deactivated_by_user_id" IS NOT NULL)),
  -- Sin motivo se guarda NULL, no un texto vacío.
  ADD CONSTRAINT ck_cases_deactivation_reason_not_blank
    CHECK ("deactivation_reason" IS NULL OR btrim("deactivation_reason") <> '');


-- ---------------------------------------------------------------------
-- cases — procedural_acts
-- ---------------------------------------------------------------------

ALTER TABLE "procedural_acts"
  -- Quién y cuándo lo modificó (HU28, D-98): los dos o ninguno.
  ADD CONSTRAINT ck_procedural_acts_last_modified_coherent
    CHECK (num_nonnulls("last_modified_by_user_id", "last_modified_at") IN (0, 2)),
  -- Una modificación no puede ser anterior al registro.
  ADD CONSTRAINT ck_procedural_acts_last_modified_after_registered
    CHECK ("last_modified_at" IS NULL OR "last_modified_at" >= "registered_at");


-- ---------------------------------------------------------------------
-- documents — case_files
-- ---------------------------------------------------------------------

ALTER TABLE "case_files"
  -- Las versiones empiezan en 1 (D-102, CA-25.6).
  ADD CONSTRAINT ck_case_files_version_positive
    CHECK ("version" >= 1),
  -- Un expediente tiene al menos la carátula.
  ADD CONSTRAINT ck_case_files_page_count_positive
    CHECK ("page_count" >= 1);


-- ---------------------------------------------------------------------
-- audit — audit_log
-- ---------------------------------------------------------------------

-- `metadata` es un objeto JSON (identificadores y nombres de campos), no
-- un escalar ni un arreglo.
ALTER TABLE "audit_log"
  ADD CONSTRAINT ck_audit_log_metadata_is_object
    CHECK ("metadata" IS NULL OR jsonb_typeof("metadata") = 'object');

-- Solo alta (AUDITORIA_Y_TRAZABILIDAD.md §2: "no borrable"). Rechaza
-- UPDATE siempre. DELETE y TRUNCATE solo proceden dentro de una
-- transacción que activó la purga a propósito, para que los tests puedan
-- limpiar la base:
--
--   SELECT set_config('vzcausas.audit_purge', 'on', true);  -- local a la transacción
--   DELETE FROM "audit_log";
--
-- No protege contra quien administra la base (puede borrar el trigger):
-- protege contra un error de la aplicación.
CREATE FUNCTION audit_log_reject_changes() RETURNS trigger
LANGUAGE plpgsql AS $$
BEGIN
  IF TG_OP IN ('DELETE', 'TRUNCATE')
     AND current_setting('vzcausas.audit_purge', true) = 'on' THEN
    IF TG_LEVEL = 'ROW' THEN
      RETURN OLD;
    END IF;
    RETURN NULL;
  END IF;
  RAISE EXCEPTION 'audit_log es de solo alta: no admite %', TG_OP
    USING ERRCODE = 'insufficient_privilege';
END;
$$;

CREATE TRIGGER trg_audit_log_append_only
  BEFORE UPDATE OR DELETE ON "audit_log"
  FOR EACH ROW EXECUTE FUNCTION audit_log_reject_changes();

CREATE TRIGGER trg_audit_log_no_truncate
  BEFORE TRUNCATE ON "audit_log"
  FOR EACH STATEMENT EXECUTE FUNCTION audit_log_reject_changes();
```

---

## 10. Impacto en el código (pendiente, no se hizo)

- **`existsBySacNumber`** (`prisma-case.repository.ts`) usa
  `findUnique({ where: { sacNumber } })`, que **deja de compilar** al regenerar
  el cliente. Pasa a `findFirst({ where: { sacNumber, active: true } })`; en
  la modificación (HU19), además, excluyendo la propia causa (`id: { not }`).
- **Carrera en el SAC.** Dos altas simultáneas pasan la verificación previa y
  la segunda choca con el índice (`P2002`). Hoy ningún código lo traduce en
  `cases`: hay que mapearlo a `409 CASE_SAC_ALREADY_EXISTS`, como hace
  `proc-state-prisma.repository.ts` con su índice. Verificar con un test qué
  informa Prisma 7 + `adapter-pg` como `target` para un índice parcial.
- **Baja.** Un solo `UPDATE` que ponga `active = false` y los tres
  `deactivated_*` a la vez (el `CHECK` no admite hacerlo en dos pasos). El
  motivo vacío o solo espacios se guarda como `NULL`.
- **Modificación de acto.** Cargar `lastModifiedByUserId` y `lastModifiedAt`
  con `ClockPort`. Ojo en los tests: un reloj fijo anterior a `registered_at`
  viola `ck_procedural_acts_last_modified_after_registered` (si molesta sin
  aportar, es el único `CHECK` prescindible).
- **Expediente.** `version = max(version) + 1` de la causa **después** de
  subir el PDF. Si el `INSERT` choca con `case_files_case_id_version_key`
  (generación simultánea), reintentar con el número siguiente y renombrar el
  archivo en Drive. Si el `INSERT` falla por otro motivo, borrar el archivo
  subido (compensación) para no dejar un PDF huérfano.
- **Auditoría.** `AuditTrailPort` del documento usa `actorUserId: string`;
  con la tabla es `number | null`. `metadata` sin valores de los campos.
- **Limpieza de los tests.** Antes de `user.deleteMany()` y
  `case.deleteMany()` hay que borrar `case_files` y `audit_log`; la auditoría
  solo con la purga:

  ```ts
  await prisma.$transaction(async (tx) => {
    await tx.$queryRaw`SELECT set_config('vzcausas.audit_purge', 'on', true)`;
    await tx.auditLog.deleteMany();
  });
  await prisma.caseFile.deleteMany();
  ```

  Afecta a `test/shared/factories/procedural-act-scenario.ts`,
  `test/shared/harness/case-folder-scenario.ts` y los specs que borran causas
  o usuarios.
- **Documentación a actualizar:** `DICCIONARIO_DATOS.md` (SAC único entre
  vigentes, columnas y tablas nuevas), `AUDITORIA_Y_TRAZABILIDAD.md` (tipo de
  `actorUserId`, tabla `audit_log`), `ADR-003_GOOGLE_DRIVE.md` (D-104).

## 11. Pendientes y riesgos

- **`offenses.prescription_date` contradice el contrato.** V5 §4 dice que de la
  prescripción "nada se guarda calculado", pero la columna existe y el agregado
  `Case` la lee (`case-prisma.mapper.ts`). Con HU19, reemplazar las
  calificaciones obliga a recalcularla teniendo en cuenta el último acto
  interruptivo, o a eliminar la columna. **No se tocó**; hay que decidirlo.
- **Deriva de Prisma.** Un índice parcial más (`cases_sac_number_active_key`)
  para revisar en cada migración generada.
- **C-20 sigue abierto.** Nada impide registrar dos veces la misma causa sin
  SAC.
- **Tamaño de `audit_log`.** `id` es `INT`, suficiente para el volumen del
  estudio. Si más adelante se auditan los inicios de sesión, revisar si
  conviene `BIGINT`.
