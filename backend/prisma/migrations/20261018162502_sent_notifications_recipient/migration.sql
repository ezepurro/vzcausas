/*
  Warnings:

  - A unique constraint covering the columns `[case_id,kind,deadline_kind,reference_date,recipient_lawyer_id]` on the table `sent_notifications` will be added. If there are existing duplicate values, this will fail.

*/
-- DropIndex
DROP INDEX "sent_notifications_once_key";

-- AlterTable
ALTER TABLE "sent_notifications" ADD COLUMN     "recipient_lawyer_id" INTEGER;

-- CreateIndex
CREATE UNIQUE INDEX "sent_notifications_once_key"
  ON "sent_notifications" ("case_id", "kind", "deadline_kind", "reference_date", "recipient_lawyer_id")
  NULLS NOT DISTINCT;

-- AddForeignKey
ALTER TABLE "sent_notifications" ADD CONSTRAINT "sent_notifications_recipient_lawyer_id_fkey" FOREIGN KEY ("recipient_lawyer_id") REFERENCES "lawyers"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
