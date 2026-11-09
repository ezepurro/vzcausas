export const COVER_PDF_RENDERER = Symbol('COVER_PDF_RENDERER');

/** The jurisdictions that have a cover template. Declared here: `documents` does not import `cases`' enum. */
export const COVER_JURISDICTIONS = ['CRIMINAL', 'ADMINISTRATIVE', 'AMPARO'] as const;

export type CoverJurisdiction = (typeof COVER_JURISDICTIONS)[number];

/**
 * What goes in each box of the cover sheet, already decided and in capitals.
 * `documents` does not know what a case is: `cases` fills the boxes (P-08 option B)
 * and this only draws them. A box that can hold several lines is a list; an empty
 * list leaves it blank.
 */
export interface CoverPdfBoxes {
  /** Picks the template (CA-24.2). Today the three are the same image; they may differ later. */
  jurisdiction: CoverJurisdiction;
  sacNumber: string;
  caption: string;
  plaintiff: readonly string[];
  defendant: readonly string[];
  interveningBody: readonly string[];
  observations: readonly string[];
}

/** Draws the cover sheet over the studio's template. Implemented in `infrastructure/pdf`. */
export interface CoverPdfRenderer {
  /** One A4 page with the six boxes filled in. */
  render(boxes: CoverPdfBoxes): Promise<Uint8Array>;
}
