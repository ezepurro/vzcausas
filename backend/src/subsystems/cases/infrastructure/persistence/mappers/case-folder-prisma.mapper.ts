import { CaseFolderStatus as PrismaCaseFolderStatus } from '../../../../../generated/prisma/enums';
import { CaseFolderView } from '../../../core/domain/ports/case/case-folder-state.port';

/**
 * What the case row needs to bring so its folder can be shown: the status, the
 * folder it points to and that folder's ancestors up to `MAIN`
 * (`MAIN › Causas › lawyer › jurisdiction › case`: four parents).
 *
 * `cases` only reads `cloud_folders` here, for the link and the path of the
 * folder it already points to. It never writes that table: `documents` owns it.
 */
export const CASE_FOLDER_INCLUDE = {
  select: {
    name: true,
    url: true,
    parent: {
      select: {
        name: true,
        parent: {
          select: {
            name: true,
            parent: { select: { name: true, parent: { select: { name: true } } } },
          },
        },
      },
    },
  },
} as const;

/**
 * The copies of templates of the case (HU40): enough to count how many were
 * copied and how many are still pending. `cases` only reads
 * `document_template_copies` here; `documents` owns and writes it (known ACL
 * debt, same shortcut as `cloud_folders`).
 */
export const TEMPLATE_COPIES_SELECT = {
  select: { status: true, template: { select: { active: true } } },
} as const;

type FolderNode = { name: string; parent?: FolderNode | null };

export interface CaseFolderRow {
  folderStatus: PrismaCaseFolderStatus | null;
  cloudFolder: (FolderNode & { url: string }) | null;
  templateCopies: Array<{ status: 'COPIED' | 'PENDING'; template: { active: boolean } }>;
}

/** `null` for a case registered before the folders existed (no status). */
export function toCaseFolderView(row: CaseFolderRow): CaseFolderView | null {
  if (row.folderStatus === null) {
    return null;
  }
  const folder = row.folderStatus === 'CREATED' ? row.cloudFolder : null;
  return {
    status: row.folderStatus,
    url: folder?.url ?? null,
    path: folder ? folderPath(folder) : null,
    templatesCopied: row.templateCopies.filter((copy) => copy.status === 'COPIED').length,
    // A pending copy of a template given de baja is never made, so it is not counted.
    templatesPending: row.templateCopies.filter((copy) => copy.status === 'PENDING' && copy.template.active).length,
  };
}

/** `/VZ Causas/Ríos, Malena/Penal/GÓMEZ…`: the names from `MAIN` down to the folder. */
function folderPath(folder: FolderNode): string {
  const names: string[] = [];
  for (let current: FolderNode | null | undefined = folder; current; current = current.parent) {
    names.unshift(current.name);
  }
  return `/${names.join('/')}`;
}
