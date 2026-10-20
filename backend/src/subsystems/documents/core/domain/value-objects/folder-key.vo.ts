import { CloudFolderKind } from './cloud-folder-kind';

/**
 * Natural key of a cloud folder: what makes it unique, mirroring the partial
 * unique indexes of `cloud_folders`. The repository looks folders up by it.
 */
export type FolderKey =
  | { kind: 'MAIN' | 'TEMPLATES' | 'ROOT_CASES' }
  | { kind: 'LAWYER'; lawyerId: number }
  | { kind: 'JURISDICTION'; lawyerId: number | null; jurisdictionId: number }
  | { kind: 'CASE'; caseId: number };

export const FolderKey = {
  main: (): FolderKey => ({ kind: 'MAIN' }),
  templates: (): FolderKey => ({ kind: 'TEMPLATES' }),
  rootCases: (): FolderKey => ({ kind: 'ROOT_CASES' }),
  lawyer: (lawyerId: number): FolderKey => ({ kind: 'LAWYER', lawyerId }),
  jurisdiction: (lawyerId: number | null, jurisdictionId: number): FolderKey => ({
    kind: 'JURISDICTION',
    lawyerId,
    jurisdictionId,
  }),
  forCase: (caseId: number): FolderKey => ({ kind: 'CASE', caseId }),
} as const;

/** Stable string form of a key, for maps and uniqueness checks. */
export function folderKeyToString(key: FolderKey): string {
  switch (key.kind) {
    case 'LAWYER':
      return `LAWYER:${key.lawyerId}`;
    case 'JURISDICTION':
      return `JURISDICTION:${key.lawyerId ?? 'templates'}:${key.jurisdictionId}`;
    case 'CASE':
      return `CASE:${key.caseId}`;
    default:
      return key.kind satisfies CloudFolderKind;
  }
}
