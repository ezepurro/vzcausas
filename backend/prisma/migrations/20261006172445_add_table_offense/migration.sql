/*
  Warnings:

  - You are about to drop the `case_legal_qualifications` table. If the table is not empty, all the data it contains will be lost.

*/
-- DropForeignKey
ALTER TABLE "case_legal_qualifications" DROP CONSTRAINT "case_legal_qualifications_case_id_fkey";

-- DropForeignKey
ALTER TABLE "case_legal_qualifications" DROP CONSTRAINT "case_legal_qualifications_legal_qualification_id_fkey";

-- DropTable
DROP TABLE "case_legal_qualifications";

-- CreateTable
CREATE TABLE "offenses" (
    "case_id" INTEGER NOT NULL,
    "legal_qualification_id" INTEGER NOT NULL,
    "offense_date" DATE NOT NULL,
    "prescription_date" DATE NOT NULL,

    CONSTRAINT "offenses_pkey" PRIMARY KEY ("case_id","legal_qualification_id")
);

-- CreateIndex
CREATE INDEX "offenses_legal_qualification_id_idx" ON "offenses"("legal_qualification_id");

-- AddForeignKey
ALTER TABLE "offenses" ADD CONSTRAINT "offenses_case_id_fkey" FOREIGN KEY ("case_id") REFERENCES "cases"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "offenses" ADD CONSTRAINT "offenses_legal_qualification_id_fkey" FOREIGN KEY ("legal_qualification_id") REFERENCES "legal_qualifications"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
