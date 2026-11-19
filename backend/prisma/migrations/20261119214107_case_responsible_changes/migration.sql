-- CreateEnum
CREATE TYPE "responsible_change_origin" AS ENUM ('LAWYER_REMOVAL', 'MANUAL');

-- CreateTable
CREATE TABLE "case_responsible_changes" (
    "id" SERIAL NOT NULL,
    "case_id" INTEGER NOT NULL,
    "previous_lawyer_id" INTEGER,
    "new_lawyer_id" INTEGER,
    "changed_by_user_id" INTEGER NOT NULL,
    "origin" "responsible_change_origin" NOT NULL,
    "changed_at" TIMESTAMPTZ(6) NOT NULL,

    CONSTRAINT "case_responsible_changes_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "case_responsible_changes_case_id_changed_at_idx" ON "case_responsible_changes"("case_id", "changed_at");

-- AddForeignKey
ALTER TABLE "case_responsible_changes" ADD CONSTRAINT "case_responsible_changes_case_id_fkey" FOREIGN KEY ("case_id") REFERENCES "cases"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "case_responsible_changes" ADD CONSTRAINT "case_responsible_changes_previous_lawyer_id_fkey" FOREIGN KEY ("previous_lawyer_id") REFERENCES "lawyers"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "case_responsible_changes" ADD CONSTRAINT "case_responsible_changes_new_lawyer_id_fkey" FOREIGN KEY ("new_lawyer_id") REFERENCES "lawyers"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "case_responsible_changes" ADD CONSTRAINT "case_responsible_changes_changed_by_user_id_fkey" FOREIGN KEY ("changed_by_user_id") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- Manual constraint (Prisma cannot express it): D-147.
--
-- A change of responsible lawyer always moves the case from one state to another:
--   previous_lawyer_id NULL     the case was orphaned and received a lawyer
--   new_lawyer_id      NULL     the case became orphaned (D-143)
-- Never both NULL (there would be no change) and never the same lawyer (nothing
-- changed). `IS DISTINCT FROM` treats NULL as a value, so one expression rejects
-- both cases: NULL IS DISTINCT FROM NULL is false, and so is 3 IS DISTINCT FROM 3.
ALTER TABLE "case_responsible_changes"
  ADD CONSTRAINT ck_case_responsible_changes_differs
    CHECK ("previous_lawyer_id" IS DISTINCT FROM "new_lawyer_id");
