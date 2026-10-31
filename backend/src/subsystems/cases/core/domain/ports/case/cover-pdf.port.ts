import { CoverSheet } from '../../value-objects/case/cover-sheet.vo';

export const COVER_PDF = Symbol('COVER_PDF');

/**
 * Port towards `documents`, which draws PDFs: its adapter lives in
 * `cases/infrastructure/acl/` and calls the use case `documents` exports
 * (P-08 option B, `ARQUITECTURA_BACKEND_V1.md` §6.2). `cases` decides what the
 * sheet says; `documents` only draws it.
 */
export interface CoverPdfPort {
  /** One A4 page with the six boxes of the sheet filled in. */
  render(sheet: CoverSheet): Promise<Uint8Array>;
}
