-- AlterTable
ALTER TABLE "cases" ADD COLUMN     "orphaned_at" TIMESTAMPTZ(6),
ALTER COLUMN "responsible_lawyer_id" DROP NOT NULL;

-- cases (D-143): una causa tiene responsable, o es huérfana y dice desde cuándo.
-- El null sin fecha, o la fecha con responsable, quedan prohibidos.
ALTER TABLE "cases"
  ADD CONSTRAINT ck_cases_orphaned_coherent
    CHECK (("responsible_lawyer_id" IS NOT NULL AND "orphaned_at" IS NULL)
        OR ("responsible_lawyer_id" IS NULL AND "orphaned_at" IS NOT NULL));
