import { Injectable } from '@nestjs/common';
import { GenerateCoverPdf } from '@subsystems/documents/core/application/use-cases/generate-cover-pdf.use-case';
import { CoverJurisdiction } from '@subsystems/documents/core/domain/ports/cover-pdf-renderer.port';
import { CoverPdfPort } from '../../core/domain/ports/case/cover-pdf.port';
import { CoverSheet } from '../../core/domain/value-objects/case/cover-sheet.vo';
import { JurisdictionCode } from '../../core/domain/value-objects/case/jurisdiction-code';

/**
 * `cases` and `documents` each name the jurisdictions on their own, with the same
 * values. Different types to the compiler, so the translation is written out:
 * exhaustive over `cases`' codes, it stops compiling if either side adds or renames one.
 */
const TO_DOCUMENTS_JURISDICTION: Record<JurisdictionCode, CoverJurisdiction> = {
  [JurisdictionCode.CRIMINAL]: 'CRIMINAL',
  [JurisdictionCode.ADMINISTRATIVE]: 'ADMINISTRATIVE',
  [JurisdictionCode.AMPARO]: 'AMPARO',
};

/**
 * Implements the {@link CoverPdfPort} that `cases` declares by calling the use case
 * `documents` exports (P-08 option B, `ARQUITECTURA_BACKEND_V1.md` §6.2). Synchronous
 * and in-process: the caller needs the PDF back, which an integration event cannot give.
 *
 * **Only translates** the sheet into the boxes `documents` draws. It decides nothing:
 * what each box says was settled by {@link CoverSheet}.
 */
@Injectable()
export class DocumentsCoverPdfAdapter implements CoverPdfPort {
  constructor(private readonly generateCoverPdf: GenerateCoverPdf) {}

  render(sheet: CoverSheet): Promise<Uint8Array> {
    return this.generateCoverPdf.execute({
      jurisdiction: TO_DOCUMENTS_JURISDICTION[sheet.jurisdiction],
      sacNumber: sheet.sacNumber,
      caption: sheet.caption,
      plaintiff: sheet.plaintiff,
      defendant: sheet.defendant,
      interveningBody: sheet.interveningBody,
      observations: sheet.observations,
    });
  }
}
