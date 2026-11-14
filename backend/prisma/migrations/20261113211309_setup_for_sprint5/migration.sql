-- AlterTable
ALTER TABLE "clients" ADD COLUMN     "deactivated_at" TIMESTAMPTZ(6),
ADD COLUMN     "deactivated_by_user_id" INTEGER,
ADD COLUMN     "deactivation_reason" VARCHAR(500);

-- AlterTable
ALTER TABLE "procedural_acts" ADD COLUMN     "active" BOOLEAN NOT NULL DEFAULT true,
ADD COLUMN     "deactivated_at" TIMESTAMPTZ(6),
ADD COLUMN     "deactivated_by_user_id" INTEGER,
ADD COLUMN     "deactivation_reason" VARCHAR(500);

-- CreateTable
CREATE TABLE "monthly_report_snapshots" (
    "period" CHAR(7) NOT NULL,
    "taken_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "data" JSONB NOT NULL,

    CONSTRAINT "monthly_report_snapshots_pkey" PRIMARY KEY ("period")
);

-- AddForeignKey
ALTER TABLE "clients" ADD CONSTRAINT "clients_deactivated_by_user_id_fkey" FOREIGN KEY ("deactivated_by_user_id") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "procedural_acts" ADD CONSTRAINT "procedural_acts_deactivated_by_user_id_fkey" FOREIGN KEY ("deactivated_by_user_id") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
