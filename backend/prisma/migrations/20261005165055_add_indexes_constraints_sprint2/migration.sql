-- =====================================================================
-- Sprint 2 — SQL manual: lo que schema.prisma no puede expresar
-- =====================================================================
--
-- Índices únicos parciales y restricciones CHECK del diseño del
-- Sprint 2 (docs/diagrams/ERD_SPRINT_2.md). Prisma no sabe declararlos,
-- así que viven en una migración escrita a mano.
--
-- CÓMO APLICARLO (docs/Backend-Architecture/USO_PRISMA.md §3):
--
--   1. `make migrate-create name=sprint_2_schema`
--      Genera la migración de las tablas y columnas nuevas SIN aplicarla.
--      Antes de aplicarla, revisar el punto "Relleno de day_type" de abajo.
--   2. `make migrate-dev`
--      Aplica la migración del paso 1.
--   3. `make migrate-create name=sprint_2_manual_constraints`
--      Crea una migración vacía, con timestamp POSTERIOR a la del paso 1.
--      Pegar en su migration.sql el contenido de este archivo.
--   4. `make migrate-dev`
--
-- El orden importa: este SQL referencia tablas y columnas que crea la
-- migración del paso 1. Si corre antes, falla.
--
-- ATENCIÓN — deriva: Prisma no conoce los índices parciales. Un
-- `migrate dev` posterior puede proponer un DROP INDEX de alguno de
-- ellos (ya pasa con `users_lawyer_id_active_key`). Si aparece en una
-- migración generada, hay que quitarlo a mano. Los CHECK no generan
-- deriva: Prisma los ignora.
--
-- ---------------------------------------------------------------------
-- Relleno de day_type (va en la migración del paso 1, NO en esta)
-- ---------------------------------------------------------------------
-- `procedural_states.day_type` pasa de anulable a NOT NULL. Si hay filas
-- con NULL, el ALTER generado por Prisma falla. Antes de la línea
-- `ALTER COLUMN "day_type" SET NOT NULL` de la migración del paso 1,
-- agregar:
--
--   UPDATE "procedural_states" ps
--   SET "day_type" = CASE
--       WHEN ps."time_limit_days" = 0 THEN 'NONE'::"day_type"
--       WHEN j."day_type_default" = 'NONE' THEN 'BUSINESS'::"day_type"
--       ELSE j."day_type_default"
--     END
--   FROM "jurisdictions" j
--   WHERE j."jurisdiction_id" = ps."jurisdiction_id"
--     AND ps."day_type" IS NULL;
--
-- Con los datos del seed no hay NULL; el UPDATE es para bases que se
-- hayan cargado a mano.
--
-- Los estados iniciales "Iniciada" (uno por fuero) NO se insertan acá:
-- los crea el seed, igual que los fueros, porque en una base nueva la
-- tabla `jurisdictions` está vacía cuando corren las migraciones.
-- =====================================================================


-- ---------------------------------------------------------------------
-- legal-parameters — procedural_states
-- ---------------------------------------------------------------------

-- La denominación es única POR FUERO, solo entre los estados vigentes y
-- sin distinguir mayúsculas. Parcial por la baja lógica: dar de baja
-- "Archivada" tiene que permitir volver a crearla (contrato §4, Bajas).
-- Reemplaza a `procedural_states_name_key`, que la migración del paso 1
-- elimina al quitar el @unique de `name`.
CREATE UNIQUE INDEX "procedural_states_jurisdiction_name_active_key"
  ON "procedural_states" ("jurisdiction_id", lower("name"))
  WHERE "is_active" = true;

-- Exactamente un estado inicial ("Iniciada") por fuero (D-34).
CREATE UNIQUE INDEX "procedural_states_one_initial_per_jurisdiction_key"
  ON "procedural_states" ("jurisdiction_id")
  WHERE "is_initial" = true;

ALTER TABLE "procedural_states"
  ADD CONSTRAINT ck_procedural_states_time_limit_days_non_negative
    CHECK ("time_limit_days" >= 0),
  -- Sin plazo ⇔ NONE: `0` días va con NONE, y más de `0` con BUSINESS o
  -- CONSECUTIVE (contrato §3.4).
  ADD CONSTRAINT ck_procedural_states_day_type_matches_time_limit
    CHECK (("time_limit_days" = 0) = ("day_type" = 'NONE')),
  -- El estado inicial no abre plazo ni cierra la causa.
  ADD CONSTRAINT ck_procedural_states_initial_is_neutral
    CHECK (NOT "is_initial"
           OR (NOT "terminal" AND "time_limit_days" = 0 AND "day_type" = 'NONE'));


-- ---------------------------------------------------------------------
-- legal-parameters — legal_qualifications
-- ---------------------------------------------------------------------

-- Única entre las vigentes, sin distinguir mayúsculas (contrato §3.5).
CREATE UNIQUE INDEX "legal_qualifications_name_active_key"
  ON "legal_qualifications" (lower("name"))
  WHERE "active" = true;

ALTER TABLE "legal_qualifications"
  ADD CONSTRAINT ck_legal_qualifications_prescription_months_positive
    CHECK ("prescription_months" >= 1);


-- ---------------------------------------------------------------------
-- people — clients
-- ---------------------------------------------------------------------

-- DNI único entre los clientes vigentes (D-17): un cliente dado de baja
-- puede volver a registrarse.
CREATE UNIQUE INDEX "clients_dni_active_key"
  ON "clients" ("dni")
  WHERE "active" = true;

-- Solo dígitos, sin puntos, 7 u 8 (contrato §3.6).
ALTER TABLE "clients"
  ADD CONSTRAINT ck_clients_dni_format
    CHECK ("dni" ~ '^[0-9]{7,8}$');


-- ---------------------------------------------------------------------
-- cases — cases
-- ---------------------------------------------------------------------

ALTER TABLE "cases"
  -- El SAC es opcional (D-33); si se informa, 8 dígitos. La unicidad la
  -- da el @unique de Prisma, que admite varios NULL.
  ADD CONSTRAINT ck_cases_sac_number_format
    CHECK ("sac_number" IS NULL OR "sac_number" ~ '^[0-9]{8}$'),
  -- La causa siempre tiene estado: uno de la tabla (incluido el inicial)
  -- o uno escrito a mano, nunca los dos ni ninguno.
  ADD CONSTRAINT ck_cases_one_current_state
    CHECK (num_nonnulls("current_state_id", "current_custom_state") = 1);


-- ---------------------------------------------------------------------
-- cases — procedural_acts
-- ---------------------------------------------------------------------

ALTER TABLE "procedural_acts"
  -- El acto lleva la causa a un estado de la tabla o a uno escrito a
  -- mano, nunca a los dos.
  ADD CONSTRAINT ck_procedural_acts_one_state
    CHECK (num_nonnulls("procedural_state_id", "custom_state") = 1),
  -- La notificación (fuero administrativo, RN6) no es anterior al acto.
  ADD CONSTRAINT ck_procedural_acts_notification_not_before_act
    CHECK ("notification_date" IS NULL OR "notification_date" >= "act_date"),
  -- El vencimiento manual no es anterior a la fecha desde la que corre
  -- el plazo.
  ADD CONSTRAINT ck_procedural_acts_manual_due_not_before_counts_from
    CHECK ("deadline_manual_due_date" IS NULL
           OR "deadline_manual_due_date" >= "deadline_counts_from");
