/**
 * Kinds of cloud folder. Mirrors the persisted `cloud_folder_kind` enum but is
 * declared here so the domain does not import the generated Prisma client.
 */
export const CLOUD_FOLDER_KINDS = [
  'MAIN',
  'TEMPLATES',
  'ROOT_CASES',
  'LAWYER',
  'JURISDICTION',
  'CASE',
  'UNASSIGNED',
  'UNASSIGNED_JURISDICTION',
] as const;

export type CloudFolderKind = (typeof CLOUD_FOLDER_KINDS)[number];
