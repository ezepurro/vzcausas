-- clients (D-122)
ALTER TABLE "clients"
  ADD CONSTRAINT ck_clients_deactivation_coherent
    CHECK (("active" AND "deactivated_at" IS NULL AND "deactivated_by_user_id" IS NULL AND "deactivation_reason" IS NULL)
        OR (NOT "active" AND "deactivated_at" IS NOT NULL AND "deactivated_by_user_id" IS NOT NULL)),
  ADD CONSTRAINT ck_clients_deactivation_reason_not_blank
    CHECK ("deactivation_reason" IS NULL OR btrim("deactivation_reason") <> '');

-- procedural_acts (D-124)
ALTER TABLE "procedural_acts"
  ADD CONSTRAINT ck_procedural_acts_deactivation_coherent
    CHECK (("active" AND "deactivated_at" IS NULL AND "deactivated_by_user_id" IS NULL AND "deactivation_reason" IS NULL)
        OR (NOT "active" AND "deactivated_at" IS NOT NULL AND "deactivated_by_user_id" IS NOT NULL)),
  ADD CONSTRAINT ck_procedural_acts_deactivation_reason_not_blank
    CHECK ("deactivation_reason" IS NULL OR btrim("deactivation_reason") <> '');

-- monthly_report_snapshots (D-117, D-141)
ALTER TABLE "monthly_report_snapshots"
  ADD CONSTRAINT ck_monthly_report_snapshots_period_format
    CHECK ("period" ~ '^[0-9]{4}-(0[1-9]|1[0-2])$'),
  ADD CONSTRAINT ck_monthly_report_snapshots_data_is_object
    CHECK (jsonb_typeof("data") = 'object');