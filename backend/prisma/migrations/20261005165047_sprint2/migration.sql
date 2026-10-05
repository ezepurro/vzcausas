/*
  Warnings:

  - You are about to drop the column `position` on the `procedural_states` table. All the data in the column will be lost.
  - Made the column `day_type` on table `procedural_states` required. This step will fail if there are existing NULL values in that column.

*/
-- CreateEnum
CREATE TYPE "procedural_role" AS ENUM ('DEFENSA', 'QUERELLANTE_PARTICULAR', 'RECURRENTE', 'ACTORA', 'DEMANDADA');

-- DropIndex
DROP INDEX "procedural_states_name_key";

-- AlterTable
ALTER TABLE "procedural_states" DROP COLUMN "position",
ADD COLUMN     "is_initial" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "updated_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
ALTER COLUMN "day_type" SET NOT NULL;

-- CreateTable
CREATE TABLE "clients" (
    "id" SERIAL NOT NULL,
    "last_name" VARCHAR(100) NOT NULL,
    "first_name" VARCHAR(100) NOT NULL,
    "dni" VARCHAR(8) NOT NULL,
    "phone" VARCHAR(50),
    "email" VARCHAR(255),
    "client_since" DATE NOT NULL,
    "active" BOOLEAN NOT NULL DEFAULT true,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) NOT NULL,

    CONSTRAINT "clients_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "legal_qualifications" (
    "id" SERIAL NOT NULL,
    "name" VARCHAR(255) NOT NULL,
    "prescription_months" INTEGER NOT NULL,
    "active" BOOLEAN NOT NULL DEFAULT true,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) NOT NULL,

    CONSTRAINT "legal_qualifications_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "cases" (
    "id" SERIAL NOT NULL,
    "sac_number" CHAR(8),
    "caption" VARCHAR(255) NOT NULL,
    "court" VARCHAR(255),
    "jurisdiction_id" INTEGER NOT NULL,
    "procedural_role" "procedural_role" NOT NULL,
    "instructor_name" VARCHAR(150),
    "instructor_phone" VARCHAR(50),
    "instructor_extension" VARCHAR(20),
    "counterparty" VARCHAR(255),
    "subject_matter" VARCHAR(800),
    "client_id" INTEGER NOT NULL,
    "responsible_lawyer_id" INTEGER NOT NULL,
    "start_date" DATE NOT NULL,
    "current_state_id" INTEGER,
    "current_custom_state" VARCHAR(255),
    "current_procedural_act_id" INTEGER,
    "active" BOOLEAN NOT NULL DEFAULT true,
    "created_by_user_id" INTEGER NOT NULL,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) NOT NULL,

    CONSTRAINT "cases_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "case_legal_qualifications" (
    "case_id" INTEGER NOT NULL,
    "legal_qualification_id" INTEGER NOT NULL,
    "offense_date" DATE NOT NULL,

    CONSTRAINT "case_legal_qualifications_pkey" PRIMARY KEY ("case_id","legal_qualification_id")
);

-- CreateTable
CREATE TABLE "procedural_acts" (
    "id" SERIAL NOT NULL,
    "case_id" INTEGER NOT NULL,
    "procedural_state_id" INTEGER,
    "custom_state" VARCHAR(255),
    "act_date" DATE NOT NULL,
    "notification_date" DATE,
    "notes" VARCHAR(2000),
    "deadline_time_limit_days" INTEGER NOT NULL,
    "deadline_day_type" "day_type" NOT NULL,
    "deadline_counts_from" DATE NOT NULL,
    "deadline_computed_due_date" DATE,
    "deadline_manual_due_date" DATE,
    "registered_by_user_id" INTEGER NOT NULL,
    "registered_by_lawyer_id" INTEGER NOT NULL,
    "registered_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "procedural_acts_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "clients_last_name_first_name_idx" ON "clients"("last_name", "first_name");

-- CreateIndex
CREATE UNIQUE INDEX "cases_sac_number_key" ON "cases"("sac_number");

-- CreateIndex
CREATE UNIQUE INDEX "cases_current_procedural_act_id_key" ON "cases"("current_procedural_act_id");

-- CreateIndex
CREATE INDEX "cases_jurisdiction_id_idx" ON "cases"("jurisdiction_id");

-- CreateIndex
CREATE INDEX "cases_client_id_idx" ON "cases"("client_id");

-- CreateIndex
CREATE INDEX "cases_responsible_lawyer_id_idx" ON "cases"("responsible_lawyer_id");

-- CreateIndex
CREATE INDEX "cases_current_state_id_idx" ON "cases"("current_state_id");

-- CreateIndex
CREATE INDEX "case_legal_qualifications_legal_qualification_id_idx" ON "case_legal_qualifications"("legal_qualification_id");

-- CreateIndex
CREATE INDEX "procedural_acts_case_id_act_date_id_idx" ON "procedural_acts"("case_id", "act_date" DESC, "id" DESC);

-- CreateIndex
CREATE INDEX "procedural_acts_procedural_state_id_idx" ON "procedural_acts"("procedural_state_id");

-- AddForeignKey
ALTER TABLE "cases" ADD CONSTRAINT "cases_jurisdiction_id_fkey" FOREIGN KEY ("jurisdiction_id") REFERENCES "jurisdictions"("jurisdiction_id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "cases" ADD CONSTRAINT "cases_client_id_fkey" FOREIGN KEY ("client_id") REFERENCES "clients"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "cases" ADD CONSTRAINT "cases_responsible_lawyer_id_fkey" FOREIGN KEY ("responsible_lawyer_id") REFERENCES "lawyers"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "cases" ADD CONSTRAINT "cases_created_by_user_id_fkey" FOREIGN KEY ("created_by_user_id") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "cases" ADD CONSTRAINT "cases_current_state_id_fkey" FOREIGN KEY ("current_state_id") REFERENCES "procedural_states"("state_id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "cases" ADD CONSTRAINT "cases_current_procedural_act_id_fkey" FOREIGN KEY ("current_procedural_act_id") REFERENCES "procedural_acts"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "case_legal_qualifications" ADD CONSTRAINT "case_legal_qualifications_case_id_fkey" FOREIGN KEY ("case_id") REFERENCES "cases"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "case_legal_qualifications" ADD CONSTRAINT "case_legal_qualifications_legal_qualification_id_fkey" FOREIGN KEY ("legal_qualification_id") REFERENCES "legal_qualifications"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "procedural_acts" ADD CONSTRAINT "procedural_acts_case_id_fkey" FOREIGN KEY ("case_id") REFERENCES "cases"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "procedural_acts" ADD CONSTRAINT "procedural_acts_procedural_state_id_fkey" FOREIGN KEY ("procedural_state_id") REFERENCES "procedural_states"("state_id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "procedural_acts" ADD CONSTRAINT "procedural_acts_registered_by_user_id_fkey" FOREIGN KEY ("registered_by_user_id") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "procedural_acts" ADD CONSTRAINT "procedural_acts_registered_by_lawyer_id_fkey" FOREIGN KEY ("registered_by_lawyer_id") REFERENCES "lawyers"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
