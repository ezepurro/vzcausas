/*
  Warnings:

  - A unique constraint covering the columns `[cloud_folder_id]` on the table `cases` will be added. If there are existing duplicate values, this will fail.
  - A unique constraint covering the columns `[cloud_file_id]` on the table `document_template_copies` will be added. If there are existing duplicate values, this will fail.
  - A unique constraint covering the columns `[cloud_file_id]` on the table `document_templates` will be added. If there are existing duplicate values, this will fail.

*/
-- CreateIndex
CREATE UNIQUE INDEX "cases_cloud_folder_id_key" ON "cases"("cloud_folder_id");

-- CreateIndex
CREATE INDEX "cloud_folders_parent_cloud_folder_id_idx" ON "cloud_folders"("parent_cloud_folder_id");

-- CreateIndex
CREATE UNIQUE INDEX "document_template_copies_cloud_file_id_key" ON "document_template_copies"("cloud_file_id");

-- CreateIndex
CREATE INDEX "document_template_copies_template_id_idx" ON "document_template_copies"("template_id");

-- CreateIndex
CREATE INDEX "document_template_jurisdictions_jurisdiction_id_idx" ON "document_template_jurisdictions"("jurisdiction_id");

-- CreateIndex
CREATE UNIQUE INDEX "document_templates_cloud_file_id_key" ON "document_templates"("cloud_file_id");

-- CreateIndex
CREATE INDEX "interruptive_acts_case_id_act_date_id_idx" ON "interruptive_acts"("case_id", "act_date" DESC, "id" DESC);

-- CreateIndex
CREATE INDEX "lawyers_last_name_first_name_idx" ON "lawyers"("last_name", "first_name");

-- CreateIndex
CREATE INDEX "users_last_name_first_name_idx" ON "users"("last_name", "first_name");
