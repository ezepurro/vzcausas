/** Input of {@link AssureSpace}: the case and who it belongs to. */
export interface AssureSpaceCommand {
  caseId: number;
  /** Case caption; it becomes the folder name (CA-39.2). */
  caseCaption: string;
  lawyer: { id: number; folderLabel: string };
  jurisdiction: { id: number; folderLabel: string };
  /** `eventId` of the event that triggered this work; absent when invoked directly (e.g. a manual retry). */
  causedByEventId?: string;
}

/** The case's cloud space. */
export interface AssureSpaceResult {
  cloudFolderId: string;
  url: string;
  /** Informational only (e.g. `Causas/Ríos, Malena/Penal/GÓMEZ…`); never use it to find the folder. */
  path: string;
}
