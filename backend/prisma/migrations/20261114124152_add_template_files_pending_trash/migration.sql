-- CreateTable
CREATE TABLE "template_files_pending_trash" (
    "cloud_file_id" VARCHAR(128) NOT NULL,
    "template_id" INTEGER NOT NULL,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "template_files_pending_trash_pkey" PRIMARY KEY ("cloud_file_id")
);

-- CreateIndex
CREATE INDEX "template_files_pending_trash_template_id_idx" ON "template_files_pending_trash"("template_id");

-- AddForeignKey
ALTER TABLE "template_files_pending_trash" ADD CONSTRAINT "template_files_pending_trash_template_id_fkey" FOREIGN KEY ("template_id") REFERENCES "document_templates"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
