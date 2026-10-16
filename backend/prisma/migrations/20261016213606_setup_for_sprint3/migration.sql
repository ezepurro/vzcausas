/*
  Warnings:

  - You are about to drop the column `full_name` on the `lawyers` table. All the data in the column will be lost.
  - You are about to drop the column `full_name` on the `users` table. All the data in the column will be lost.
  - Added the required column `first_name` to the `lawyers` table without a default value. This is not possible if the table is not empty.
  - Added the required column `last_name` to the `lawyers` table without a default value. This is not possible if the table is not empty.
  - Added the required column `first_name` to the `users` table without a default value. This is not possible if the table is not empty.
  - Added the required column `last_name` to the `users` table without a default value. This is not possible if the table is not empty.

*/
-- CreateEnum
CREATE TYPE "cloud_folder_kind" AS ENUM ('MAIN', 'TEMPLATES', 'ROOT_CASES', 'LAWYER', 'JURISDICTION', 'CASE');

-- CreateEnum
CREATE TYPE "case_folder_status" AS ENUM ('CREATED', 'PENDING');

-- CreateEnum
CREATE TYPE "template_copy_status" AS ENUM ('COPIED', 'PENDING');

-- CreateEnum
CREATE TYPE "deadline_kind" AS ENUM ('PROCEDURAL_ACT', 'HARMFUL_ACT');

-- CreateEnum
CREATE TYPE "notification_kind" AS ENUM ('DEADLINE_WARNING', 'DEADLINE_DUE_TODAY', 'PRESCRIPTION_ALERT', 'PRESCRIPTION_EXPIRED');

-- AlterTable
ALTER TABLE "cases" ADD COLUMN     "administrative_remedy_exhausted_on" DATE,
ADD COLUMN     "client_detained" BOOLEAN,
ADD COLUMN     "cloud_folder_id" VARCHAR(128),
ADD COLUMN     "court_fee_paid" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "folder_status" "case_folder_status",
ADD COLUMN     "harmful_act_date" DATE,
ADD COLUMN     "harmful_act_renewal_days" INTEGER,
ADD COLUMN     "harmful_act_renews" BOOLEAN,
ADD COLUMN     "harmful_act_term_day_type" "day_type",
ADD COLUMN     "harmful_act_term_days" INTEGER,
ADD COLUMN     "injunction_granted" BOOLEAN,
ADD COLUMN     "prescription_date" DATE,
ADD COLUMN     "prescription_grounds" VARCHAR(2000),
ADD COLUMN     "prescription_registered_at" TIMESTAMPTZ(6),
ADD COLUMN     "prescription_registered_by_user_id" INTEGER,
ADD COLUMN     "prescription_resolution" VARCHAR(255);

-- AlterTable
ALTER TABLE "lawyers" DROP COLUMN "full_name",
ADD COLUMN     "first_name" VARCHAR(100) NOT NULL,
ADD COLUMN     "last_name" VARCHAR(100) NOT NULL;

-- AlterTable
ALTER TABLE "procedural_acts" ADD COLUMN     "is_interruptive" BOOLEAN NOT NULL DEFAULT true;

-- AlterTable
ALTER TABLE "procedural_states" ADD COLUMN     "is_prescribed" BOOLEAN NOT NULL DEFAULT false;

-- AlterTable
ALTER TABLE "users" DROP COLUMN "full_name",
ADD COLUMN     "first_name" VARCHAR(100) NOT NULL,
ADD COLUMN     "last_name" VARCHAR(100) NOT NULL;

-- CreateTable
CREATE TABLE "interruptive_acts" (
    "id" SERIAL NOT NULL,
    "case_id" INTEGER NOT NULL,
    "name" VARCHAR(255) NOT NULL,
    "act_date" DATE NOT NULL,
    "notes" VARCHAR(2000),
    "registered_by_user_id" INTEGER NOT NULL,
    "registered_by_lawyer_id" INTEGER NOT NULL,
    "registered_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "interruptive_acts_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "cloud_folders" (
    "cloud_folder_id" VARCHAR(128) NOT NULL,
    "kind" "cloud_folder_kind" NOT NULL,
    "name" VARCHAR(255) NOT NULL,
    "url" VARCHAR(512) NOT NULL,
    "parent_cloud_folder_id" VARCHAR(128),
    "lawyer_id" INTEGER,
    "jurisdiction_id" INTEGER,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "cloud_folders_pkey" PRIMARY KEY ("cloud_folder_id")
);

-- CreateTable
CREATE TABLE "document_templates" (
    "id" SERIAL NOT NULL,
    "name" VARCHAR(150) NOT NULL,
    "file_name" VARCHAR(255) NOT NULL,
    "cloud_file_id" VARCHAR(128) NOT NULL,
    "cloud_folder_id" VARCHAR(128) NOT NULL,
    "copy_to_new_cases" BOOLEAN NOT NULL DEFAULT true,
    "last_version_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "last_version_by_user_id" INTEGER NOT NULL,
    "active" BOOLEAN NOT NULL DEFAULT true,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) NOT NULL,

    CONSTRAINT "document_templates_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "document_template_jurisdictions" (
    "template_id" INTEGER NOT NULL,
    "jurisdiction_id" INTEGER NOT NULL,

    CONSTRAINT "document_template_jurisdictions_pkey" PRIMARY KEY ("template_id","jurisdiction_id")
);

-- CreateTable
CREATE TABLE "document_template_copies" (
    "case_id" INTEGER NOT NULL,
    "template_id" INTEGER NOT NULL,
    "status" "template_copy_status" NOT NULL,
    "cloud_file_id" VARCHAR(128),
    "copied_at" TIMESTAMPTZ(6),

    CONSTRAINT "document_template_copies_pkey" PRIMARY KEY ("case_id","template_id")
);

-- CreateTable
CREATE TABLE "user_folder_access" (
    "user_id" INTEGER NOT NULL,
    "email" VARCHAR(255) NOT NULL,
    "cloud_permission_id" VARCHAR(128),
    "granted" BOOLEAN NOT NULL,
    "synced_at" TIMESTAMPTZ(6),

    CONSTRAINT "user_folder_access_pkey" PRIMARY KEY ("user_id")
);

-- CreateTable
CREATE TABLE "sent_notifications" (
    "id" SERIAL NOT NULL,
    "case_id" INTEGER NOT NULL,
    "kind" "notification_kind" NOT NULL,
    "deadline_kind" "deadline_kind",
    "procedural_act_id" INTEGER,
    "reference_date" DATE NOT NULL,
    "sent_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "sent_notifications_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "daily_job_runs" (
    "run_date" DATE NOT NULL,
    "started_at" TIMESTAMPTZ(6) NOT NULL,
    "finished_at" TIMESTAMPTZ(6),
    "error" TEXT,

    CONSTRAINT "daily_job_runs_pkey" PRIMARY KEY ("run_date")
);

-- AddForeignKey
ALTER TABLE "cases" ADD CONSTRAINT "cases_cloud_folder_id_fkey" FOREIGN KEY ("cloud_folder_id") REFERENCES "cloud_folders"("cloud_folder_id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "cases" ADD CONSTRAINT "cases_prescription_registered_by_user_id_fkey" FOREIGN KEY ("prescription_registered_by_user_id") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "interruptive_acts" ADD CONSTRAINT "interruptive_acts_case_id_fkey" FOREIGN KEY ("case_id") REFERENCES "cases"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "interruptive_acts" ADD CONSTRAINT "interruptive_acts_registered_by_user_id_fkey" FOREIGN KEY ("registered_by_user_id") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "interruptive_acts" ADD CONSTRAINT "interruptive_acts_registered_by_lawyer_id_fkey" FOREIGN KEY ("registered_by_lawyer_id") REFERENCES "lawyers"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "cloud_folders" ADD CONSTRAINT "cloud_folders_parent_cloud_folder_id_fkey" FOREIGN KEY ("parent_cloud_folder_id") REFERENCES "cloud_folders"("cloud_folder_id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "cloud_folders" ADD CONSTRAINT "cloud_folders_lawyer_id_fkey" FOREIGN KEY ("lawyer_id") REFERENCES "lawyers"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "cloud_folders" ADD CONSTRAINT "cloud_folders_jurisdiction_id_fkey" FOREIGN KEY ("jurisdiction_id") REFERENCES "jurisdictions"("jurisdiction_id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "document_templates" ADD CONSTRAINT "document_templates_cloud_folder_id_fkey" FOREIGN KEY ("cloud_folder_id") REFERENCES "cloud_folders"("cloud_folder_id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "document_templates" ADD CONSTRAINT "document_templates_last_version_by_user_id_fkey" FOREIGN KEY ("last_version_by_user_id") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "document_template_jurisdictions" ADD CONSTRAINT "document_template_jurisdictions_template_id_fkey" FOREIGN KEY ("template_id") REFERENCES "document_templates"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "document_template_jurisdictions" ADD CONSTRAINT "document_template_jurisdictions_jurisdiction_id_fkey" FOREIGN KEY ("jurisdiction_id") REFERENCES "jurisdictions"("jurisdiction_id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "document_template_copies" ADD CONSTRAINT "document_template_copies_case_id_fkey" FOREIGN KEY ("case_id") REFERENCES "cases"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "document_template_copies" ADD CONSTRAINT "document_template_copies_template_id_fkey" FOREIGN KEY ("template_id") REFERENCES "document_templates"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "user_folder_access" ADD CONSTRAINT "user_folder_access_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "sent_notifications" ADD CONSTRAINT "sent_notifications_case_id_fkey" FOREIGN KEY ("case_id") REFERENCES "cases"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "sent_notifications" ADD CONSTRAINT "sent_notifications_procedural_act_id_fkey" FOREIGN KEY ("procedural_act_id") REFERENCES "procedural_acts"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
