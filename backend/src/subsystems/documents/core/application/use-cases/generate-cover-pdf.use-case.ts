import { Inject, Injectable } from '@nestjs/common';
import { COVER_PDF_RENDERER, CoverPdfBoxes, CoverPdfRenderer } from '../../domain/ports/cover-pdf-renderer.port';

/**
 * Draws the cover sheet of a case as a PDF (HU24). It is what `documents` exports to
 * `cases` (P-08 option B, `ARQUITECTURA_BACKEND_V1.md` §6.2): the caller decides what
 * each box says, this only turns it into a page. HU25 (the expediente) reuses it for
 * its first page.
 */
@Injectable()
export class GenerateCoverPdf {
  constructor(@Inject(COVER_PDF_RENDERER) private readonly renderer: CoverPdfRenderer) {}

  execute(boxes: CoverPdfBoxes): Promise<Uint8Array> {
    return this.renderer.render(boxes);
  }
}
