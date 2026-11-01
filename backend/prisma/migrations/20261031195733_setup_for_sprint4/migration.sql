-- DropIndex
DROP INDEX "cases_sac_number_key";

-- AlterTable
ALTER TABLE "cases" ADD COLUMN     "deactivated_at" TIMESTAMPTZ(6),
ADD COLUMN     "deactivated_by_user_id" INTEGER,
ADD COLUMN     "deactivation_reason" VARCHAR(500);

-- AlterTable
ALTER TABLE "procedural_acts" ADD COLUMN     "last_modified_at" TIMESTAMPTZ(6),
ADD COLUMN     "last_modified_by_user_id" INTEGER;

-- CreateTable
CREATE TABLE "case_files" (
    "id" SERIAL NOT NULL,
    "case_id" INTEGER NOT NULL,
    "version" INTEGER NOT NULL,
    "cloud_file_id" VARCHAR(128) NOT NULL,
    "file_name" VARCHAR(255) NOT NULL,
    "page_count" INTEGER NOT NULL,
    "generated_by_user_id" INTEGER NOT NULL,
    "generated_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "case_files_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "audit_log" (
    "id" SERIAL NOT NULL,
    "actor_user_id" INTEGER,
    "action" VARCHAR(100) NOT NULL,
    "entity_type" VARCHAR(50) NOT NULL,
    "entity_id" VARCHAR(128) NOT NULL,
    "occurred_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "metadata" JSONB,
    "correlation_id" VARCHAR(128),

    CONSTRAINT "audit_log_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "case_files_cloud_file_id_key" ON "case_files"("cloud_file_id");

-- CreateIndex
CREATE UNIQUE INDEX "case_files_case_id_version_key" ON "case_files"("case_id", "version");

-- CreateIndex
CREATE INDEX "audit_log_entity_type_entity_id_occurred_at_idx" ON "audit_log"("entity_type", "entity_id", "occurred_at");

-- CreateIndex
CREATE INDEX "audit_log_actor_user_id_occurred_at_idx" ON "audit_log"("actor_user_id", "occurred_at");

-- AddForeignKey
ALTER TABLE "cases" ADD CONSTRAINT "cases_deactivated_by_user_id_fkey" FOREIGN KEY ("deactivated_by_user_id") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "procedural_acts" ADD CONSTRAINT "procedural_acts_last_modified_by_user_id_fkey" FOREIGN KEY ("last_modified_by_user_id") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "case_files" ADD CONSTRAINT "case_files_case_id_fkey" FOREIGN KEY ("case_id") REFERENCES "cases"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "case_files" ADD CONSTRAINT "case_files_generated_by_user_id_fkey" FOREIGN KEY ("generated_by_user_id") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "audit_log" ADD CONSTRAINT "audit_log_actor_user_id_fkey" FOREIGN KEY ("actor_user_id") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
