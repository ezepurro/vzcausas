-- cases: SAC único entre vigentes (D-97). Reemplaza a "cases_sac_number_key",
-- que la migración generada borra al quitar el @unique.
CREATE UNIQUE INDEX "cases_sac_number_active_key"
  ON "cases" ("sac_number")
  WHERE "active" = true AND "sac_number" IS NOT NULL;

ALTER TABLE "cases"
  ADD CONSTRAINT ck_cases_deactivation_coherent
    CHECK (
      ("active"
        AND "deactivated_at" IS NULL
        AND "deactivated_by_user_id" IS NULL
        AND "deactivation_reason" IS NULL)
      OR (NOT "active"
        AND "deactivated_at" IS NOT NULL
        AND "deactivated_by_user_id" IS NOT NULL)),
  ADD CONSTRAINT ck_cases_deactivation_reason_not_blank
    CHECK ("deactivation_reason" IS NULL OR btrim("deactivation_reason") <> '');

-- procedural_acts: quién y cuándo, los dos o ninguno; nunca antes del registro.
ALTER TABLE "procedural_acts"
  ADD CONSTRAINT ck_procedural_acts_last_modified_coherent
    CHECK (num_nonnulls("last_modified_by_user_id", "last_modified_at") IN (0, 2)),
  ADD CONSTRAINT ck_procedural_acts_last_modified_after_registered
    CHECK ("last_modified_at" IS NULL OR "last_modified_at" >= "registered_at");

-- case_files
ALTER TABLE "case_files"
  ADD CONSTRAINT ck_case_files_version_positive    CHECK ("version" >= 1),
  ADD CONSTRAINT ck_case_files_page_count_positive CHECK ("page_count" >= 1);

-- audit_log: metadata es un objeto JSON, y la tabla es de solo alta.
ALTER TABLE "audit_log"
  ADD CONSTRAINT ck_audit_log_metadata_is_object
    CHECK ("metadata" IS NULL OR jsonb_typeof("metadata") = 'object');

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