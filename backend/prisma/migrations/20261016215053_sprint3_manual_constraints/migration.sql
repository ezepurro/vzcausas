-- =====================================================================
-- Sprint 3 — SQL manual: lo que schema.prisma no puede expresar
-- =====================================================================
--
-- Índices únicos parciales, índices por expresión y restricciones CHECK
-- del diseño del Sprint 3 (docs/support/cambios-bdd-sprint3.md, API
-- Contract V4). Los índices comunes están en schema.prisma y los creó
-- `sprint3_common_indexes`.
--
-- Va después de `setup_for_sprint3`, que crea las tablas y columnas que
-- este SQL referencia.
--
-- ATENCIÓN — deriva: Prisma no conoce los índices parciales ni los
-- índices por expresión. Si una migración generada después trae un DROP
-- INDEX de alguno de estos, hay que quitarlo a mano. Los CHECK no
-- generan deriva: Prisma los ignora.
--
-- Quedan en el dominio, porque un CHECK no puede leer el código del
-- fuero (`cases` guarda `jurisdiction_id`): qué datos de la causa
-- corresponden a cada fuero, y que "Prescripta" sea solo de CRIMINAL.
-- =====================================================================


-- ---------------------------------------------------------------------
-- legal-parameters — procedural_states
-- ---------------------------------------------------------------------

-- Un solo estado "Prescripta" por fuero (D-53).
CREATE UNIQUE INDEX "procedural_states_one_prescribed_per_jurisdiction_key"
  ON "procedural_states" ("jurisdiction_id")
  WHERE "is_prescribed" = true;

-- "Prescripta" es terminal, no abre plazo y no es a la vez el inicial.
ALTER TABLE "procedural_states"
  ADD CONSTRAINT ck_procedural_states_prescribed_is_terminal
    CHECK (NOT "is_prescribed"
           OR ("terminal" AND NOT "is_initial"
               AND "time_limit_days" = 0 AND "day_type" = 'NONE'));


-- ---------------------------------------------------------------------
-- cases — cases
-- ---------------------------------------------------------------------

ALTER TABLE "cases"
  -- Acto lesivo del amparo (D-67, D-78): los días de renovación existen
  -- solo si el acto se renueva, y son al menos uno.
  ADD CONSTRAINT ck_cases_harmful_act_renewal_coherent
    CHECK (("harmful_act_renews" IS TRUE) = ("harmful_act_renewal_days" IS NOT NULL)),
  ADD CONSTRAINT ck_cases_harmful_act_renewal_days_positive
    CHECK ("harmful_act_renewal_days" IS NULL OR "harmful_act_renewal_days" >= 1),
  -- Con fecha del acto lesivo van el plazo y su forma de cómputo; sin
  -- fecha, ninguno de los dos.
  ADD CONSTRAINT ck_cases_harmful_act_term_complete
    CHECK (num_nonnulls("harmful_act_date", "harmful_act_term_days",
                        "harmful_act_term_day_type") IN (0, 3)),
  ADD CONSTRAINT ck_cases_harmful_act_term_days_positive
    CHECK ("harmful_act_term_days" IS NULL OR "harmful_act_term_days" >= 1),
  -- El plazo del amparo se cuenta en días hábiles o corridos, nunca NONE.
  ADD CONSTRAINT ck_cases_harmful_act_term_day_type
    CHECK ("harmful_act_term_day_type" IS NULL OR "harmful_act_term_day_type" <> 'NONE'),
  -- Solo una carpeta CREATED tiene carpeta en la nube; PENDING o sin
  -- carpeta pedida (NULL), no (D-60).
  ADD CONSTRAINT ck_cases_folder_created_has_cloud_folder
    CHECK (("folder_status" IS NOT DISTINCT FROM 'CREATED') = ("cloud_folder_id" IS NOT NULL)),
  -- La declaración de prescripción (HU33) se carga entera o no se carga;
  -- el fundamento es lo único opcional (D-52, D-54).
  ADD CONSTRAINT ck_cases_prescription_declaration_complete
    CHECK (num_nonnulls("prescription_date", "prescription_resolution",
                        "prescription_registered_by_user_id",
                        "prescription_registered_at") IN (0, 4)),
  ADD CONSTRAINT ck_cases_prescription_grounds_need_declaration
    CHECK ("prescription_grounds" IS NULL OR "prescription_date" IS NOT NULL);


-- ---------------------------------------------------------------------
-- documents — cloud_folders
-- ---------------------------------------------------------------------

-- Una sola carpeta MAIN, una TEMPLATES y una ROOT_CASES.
CREATE UNIQUE INDEX "cloud_folders_one_root_per_kind_key"
  ON "cloud_folders" ("kind")
  WHERE "kind" IN ('MAIN', 'TEMPLATES', 'ROOT_CASES');

-- Una carpeta por abogado.
CREATE UNIQUE INDEX "cloud_folders_one_per_lawyer_key"
  ON "cloud_folders" ("lawyer_id")
  WHERE "kind" = 'LAWYER';

-- Una carpeta de fuero por abogado y fuero. Resuelve la carrera de
-- ADR-003 §2.5: dos causas del mismo abogado y fuero creadas a la vez;
-- la que pierde reutiliza la carpeta de la que ganó.
CREATE UNIQUE INDEX "cloud_folders_one_per_lawyer_jurisdiction_key"
  ON "cloud_folders" ("lawyer_id", "jurisdiction_id")
  WHERE "kind" = 'JURISDICTION' AND "lawyer_id" IS NOT NULL;

-- Una carpeta de modelos por fuero.
CREATE UNIQUE INDEX "cloud_folders_one_template_jurisdiction_key"
  ON "cloud_folders" ("jurisdiction_id")
  WHERE "kind" = 'JURISDICTION' AND "lawyer_id" IS NULL;

-- Qué columnas lleva cada tipo de carpeta:
--   MAIN                   sin padre, sin abogado, sin fuero
--   TEMPLATES, ROOT_CASES  con padre, sin abogado, sin fuero
--   LAWYER                 con padre, con abogado, sin fuero
--   JURISDICTION           con padre y fuero; con abogado solo en causas
--   CASE                   con padre, con abogado, con fuero
ALTER TABLE "cloud_folders"
  ADD CONSTRAINT ck_cloud_folders_shape_by_kind
    CHECK (
      ("kind" = 'MAIN'
        AND "parent_cloud_folder_id" IS NULL
        AND "lawyer_id" IS NULL AND "jurisdiction_id" IS NULL)
      OR ("kind" IN ('TEMPLATES', 'ROOT_CASES')
        AND "parent_cloud_folder_id" IS NOT NULL
        AND "lawyer_id" IS NULL AND "jurisdiction_id" IS NULL)
      OR ("kind" = 'LAWYER'
        AND "parent_cloud_folder_id" IS NOT NULL
        AND "lawyer_id" IS NOT NULL AND "jurisdiction_id" IS NULL)
      OR ("kind" = 'JURISDICTION'
        AND "parent_cloud_folder_id" IS NOT NULL
        AND "jurisdiction_id" IS NOT NULL)
      OR ("kind" = 'CASE'
        AND "parent_cloud_folder_id" IS NOT NULL
        AND "lawyer_id" IS NOT NULL AND "jurisdiction_id" IS NOT NULL)
    );


-- ---------------------------------------------------------------------
-- documents — document_templates y document_template_copies
-- ---------------------------------------------------------------------

-- Nombre único entre los modelos vigentes, sin distinguir mayúsculas
-- (D-71). Parcial por la baja lógica, como las calificaciones legales.
CREATE UNIQUE INDEX "document_templates_name_active_key"
  ON "document_templates" (lower("name"))
  WHERE "active" = true;

-- Una copia COPIED tiene su archivo y su fecha; una PENDING, ninguno.
ALTER TABLE "document_template_copies"
  ADD CONSTRAINT ck_document_template_copies_copied_has_file
    CHECK (("status" = 'COPIED') = ("cloud_file_id" IS NOT NULL AND "copied_at" IS NOT NULL));


-- ---------------------------------------------------------------------
-- deadlines — sent_notifications y daily_job_runs
-- ---------------------------------------------------------------------

-- Cada aviso se envía una vez por causa, tipo y fecha de referencia
-- (D-64). Una renovación del acto lesivo o un acto interruptivo cambian
-- `reference_date`, y entonces se vuelve a avisar. NULLS NOT DISTINCT
-- (PostgreSQL 15+) porque los avisos de prescripción no tienen
-- `deadline_kind`, y con NULL distintos se podrían repetir.
CREATE UNIQUE INDEX "sent_notifications_once_key"
  ON "sent_notifications" ("case_id", "kind", "deadline_kind", "reference_date")
  NULLS NOT DISTINCT;

ALTER TABLE "sent_notifications"
  -- Solo los avisos de vencimiento dicen de qué vencimiento son.
  ADD CONSTRAINT ck_sent_notifications_deadline_kind_coherent
    CHECK (("kind" IN ('DEADLINE_WARNING', 'DEADLINE_DUE_TODAY'))
           = ("deadline_kind" IS NOT NULL)),
  -- El acto procesal solo se informa en un vencimiento de acto procesal.
  ADD CONSTRAINT ck_sent_notifications_act_only_for_procedural_deadline
    CHECK ("procedural_act_id" IS NULL OR "deadline_kind" = 'PROCEDURAL_ACT');

ALTER TABLE "daily_job_runs"
  ADD CONSTRAINT ck_daily_job_runs_finished_after_started
    CHECK ("finished_at" IS NULL OR "finished_at" >= "started_at");
