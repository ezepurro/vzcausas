-- CreateTable
CREATE TABLE "document_template_files" (
    "template_id" INTEGER NOT NULL,
    "jurisdiction_id" INTEGER NOT NULL,
    "cloud_file_id" VARCHAR(128) NOT NULL,
    "cloud_folder_id" VARCHAR(128) NOT NULL,

    CONSTRAINT "document_template_files_pkey" PRIMARY KEY ("template_id","jurisdiction_id")
);

-- CreateIndex
CREATE UNIQUE INDEX "document_template_files_cloud_file_id_key" ON "document_template_files"("cloud_file_id");

-- CreateIndex
CREATE INDEX "document_template_files_cloud_folder_id_idx" ON "document_template_files"("cloud_folder_id");

-- AddForeignKey
ALTER TABLE "document_template_files" ADD CONSTRAINT "document_template_files_template_id_fkey" FOREIGN KEY ("template_id") REFERENCES "document_templates"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "document_template_files" ADD CONSTRAINT "document_template_files_jurisdiction_id_fkey" FOREIGN KEY ("jurisdiction_id") REFERENCES "jurisdictions"("jurisdiction_id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "document_template_files" ADD CONSTRAINT "document_template_files_cloud_folder_id_fkey" FOREIGN KEY ("cloud_folder_id") REFERENCES "cloud_folders"("cloud_folder_id") ON DELETE RESTRICT ON UPDATE CASCADE;
