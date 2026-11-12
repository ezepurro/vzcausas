-- AlterTable
ALTER TABLE "offenses" ADD COLUMN     "prescription_declared_on" DATE,
ADD COLUMN     "prescription_grounds" VARCHAR(2000),
ADD COLUMN     "prescription_registered_at" TIMESTAMPTZ(6),
ADD COLUMN     "prescription_registered_by_user_id" INTEGER,
ADD COLUMN     "prescription_resolution" VARCHAR(255);

-- AddForeignKey
ALTER TABLE "offenses" ADD CONSTRAINT "offenses_prescription_registered_by_user_id_fkey" FOREIGN KEY ("prescription_registered_by_user_id") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
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
