-- AlterTable
ALTER TABLE "interruptive_acts" ALTER COLUMN "registered_by_lawyer_id" DROP NOT NULL;

-- AlterTable
ALTER TABLE "procedural_acts" ALTER COLUMN "registered_by_lawyer_id" DROP NOT NULL;
