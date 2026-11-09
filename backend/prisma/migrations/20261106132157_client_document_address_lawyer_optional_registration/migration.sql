/*
  Hand-edited after `--create-only`: Prisma wanted to DROP `dni` and ADD a
  NOT NULL `document_number`, which loses the data of the existing clients.
  `dni` is renamed instead (D-108). The partial unique index and the format
  CHECK that depended on `dni` are replaced by ones on (type, number).
*/

-- CreateEnum
CREATE TYPE "document_type" AS ENUM ('DNI', 'PASSPORT');

-- Existing clients keep their number and become DNI (D-108).
ALTER TABLE "clients" RENAME COLUMN "dni" TO "document_number";
ALTER TABLE "clients" ALTER COLUMN "document_number" TYPE VARCHAR(20);
ALTER TABLE "clients" ADD COLUMN "document_type" "document_type" NOT NULL DEFAULT 'DNI';

-- Address and phone are required, in the database too (D-109). Adding a NOT
-- NULL column fails on a table with rows, and there is no value to backfill
-- with: this migration assumes the clients table holds only test data, which
-- is reset and reseeded (decided on 06/11/2026).
ALTER TABLE "clients" ADD COLUMN "address" VARCHAR(255) NOT NULL;
ALTER TABLE "clients" ALTER COLUMN "phone" SET NOT NULL;

-- Unique per (type, number) among active clients; a DNI and a passport with
-- the same number do not collide (D-108).
DROP INDEX "clients_dni_active_key";
CREATE UNIQUE INDEX "clients_document_active_key"
  ON "clients" ("document_type", "document_number")
  WHERE "active" = true;

-- Format depends on the type (contract: DocumentType).
ALTER TABLE "clients" DROP CONSTRAINT ck_clients_dni_format;
ALTER TABLE "clients"
  ADD CONSTRAINT ck_clients_document_format
    CHECK (
      ("document_type" = 'DNI' AND "document_number" ~ '^[0-9]{7,8}$')
      OR ("document_type" = 'PASSPORT' AND "document_number" ~ '^[A-Z0-9]{6,20}$')
    );

-- Optional registration number (D-107). The unique index stays: PostgreSQL
-- admits several NULLs.
ALTER TABLE "lawyers" ALTER COLUMN "registration_number" DROP NOT NULL;
