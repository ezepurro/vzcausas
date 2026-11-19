-- documents — cloud_folders: the folders of orphaned cases (D-143).
--
-- An orphaned case has no lawyer, so its folder hangs from
-- `Causas/Sin asignar/{fuero}` instead of `Causas/{lawyer}/{fuero}`:
--   UNASSIGNED               Causas/Sin asignar
--   UNASSIGNED_JURISDICTION  Causas/Sin asignar/{fuero}
--   CASE                     its lawyer_id is NULL when it hangs from Sin asignar
--
-- The two enum values were added by the previous migration: Postgres cannot
-- use a new value in the transaction that adds it.

-- Only one folder per root kind, now also for Sin asignar.
DROP INDEX "cloud_folders_one_root_per_kind_key";
CREATE UNIQUE INDEX "cloud_folders_one_root_per_kind_key"
  ON "cloud_folders" ("kind")
  WHERE "kind" IN ('MAIN', 'TEMPLATES', 'ROOT_CASES', 'UNASSIGNED');

-- One fuero folder below Sin asignar, per fuero. Same race as
-- `cloud_folders_one_per_lawyer_jurisdiction_key` (ADR-003 §2.5): two orphaned
-- cases of the same fuero created at once; the loser reuses the winner's folder.
CREATE UNIQUE INDEX "cloud_folders_one_unassigned_jurisdiction_key"
  ON "cloud_folders" ("jurisdiction_id")
  WHERE "kind" = 'UNASSIGNED_JURISDICTION';

-- What columns each kind of folder carries:
--   MAIN                      no parent, no lawyer, no jurisdiction
--   TEMPLATES, ROOT_CASES     parent, no lawyer, no jurisdiction
--   UNASSIGNED                parent, no lawyer, no jurisdiction
--   LAWYER                    parent, lawyer, no jurisdiction
--   JURISDICTION              parent and jurisdiction; lawyer only in cases
--   UNASSIGNED_JURISDICTION   parent and jurisdiction, no lawyer
--   CASE                      parent and jurisdiction; lawyer unless orphaned
ALTER TABLE "cloud_folders" DROP CONSTRAINT ck_cloud_folders_shape_by_kind;
ALTER TABLE "cloud_folders"
  ADD CONSTRAINT ck_cloud_folders_shape_by_kind
    CHECK (
      ("kind" = 'MAIN'
        AND "parent_cloud_folder_id" IS NULL
        AND "lawyer_id" IS NULL AND "jurisdiction_id" IS NULL)
      OR ("kind" IN ('TEMPLATES', 'ROOT_CASES', 'UNASSIGNED')
        AND "parent_cloud_folder_id" IS NOT NULL
        AND "lawyer_id" IS NULL AND "jurisdiction_id" IS NULL)
      OR ("kind" = 'LAWYER'
        AND "parent_cloud_folder_id" IS NOT NULL
        AND "lawyer_id" IS NOT NULL AND "jurisdiction_id" IS NULL)
      OR ("kind" = 'JURISDICTION'
        AND "parent_cloud_folder_id" IS NOT NULL
        AND "jurisdiction_id" IS NOT NULL)
      OR ("kind" = 'UNASSIGNED_JURISDICTION'
        AND "parent_cloud_folder_id" IS NOT NULL
        AND "lawyer_id" IS NULL AND "jurisdiction_id" IS NOT NULL)
      OR ("kind" = 'CASE'
        AND "parent_cloud_folder_id" IS NOT NULL
        AND "jurisdiction_id" IS NOT NULL)
    );
