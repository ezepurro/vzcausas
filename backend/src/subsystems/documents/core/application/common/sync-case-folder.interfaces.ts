/**
 * Input of {@link SyncCaseFolder}: the whole destination of the folder, not
 * just what changed, so `documents` never has to ask `cases` (HU19, D-104).
 */
export interface SyncCaseFolderCommand {
  caseId: number;
  /** The caption the folder must be named after. */
  caseCaption: string;
  /** The responsible lawyer whose folder must hold it. */
  lawyer: { id: number; folderLabel: string };
  jurisdiction: { id: number; folderLabel: string };
  /** `eventId` of the event that triggered this work; absent when invoked directly. */
  causedByEventId?: string;
}

/**
 * How the sync ended. `NO_FOLDER`: the case has no folder in the cloud, so
 * there is nothing to follow. `UNCHANGED`: the folder already had the right
 * name and place. `RELOCATED`: it was renamed, moved, or both.
 */
export interface SyncCaseFolderResult {
  outcome: 'NO_FOLDER' | 'UNCHANGED' | 'RELOCATED';
}
