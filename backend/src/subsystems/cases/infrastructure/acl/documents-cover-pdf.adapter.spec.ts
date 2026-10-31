import { GenerateCoverPdf } from '@subsystems/documents/core/application/use-cases/generate-cover-pdf.use-case';
import { CoverPdfBoxes } from '@subsystems/documents/core/domain/ports/cover-pdf-renderer.port';
import { CoverSheet } from '../../core/domain/value-objects/case/cover-sheet.vo';
import { JurisdictionCode } from '../../core/domain/value-objects/case/jurisdiction-code';
import { ProceduralRole } from '../../core/domain/value-objects/case/procedural-role';
import { CLIENT, LAWYER } from '../../core/test-support/case-fixtures';
import { DocumentsCoverPdfAdapter } from './documents-cover-pdf.adapter';

class RecordingGenerateCoverPdf {
  received: CoverPdfBoxes[] = [];

  async execute(boxes: CoverPdfBoxes): Promise<Uint8Array> {
    this.received.push(boxes);
    return Buffer.from('%PDF-fake');
  }
}

function aSheet(jurisdiction: JurisdictionCode): CoverSheet {
  return CoverSheet.create({
    id: 7,
    sacNumber: '13284571',
    caption: 'Autos',
    court: 'Juzgado',
    jurisdiction,
    proceduralRole: ProceduralRole.DEFENSA,
    instructorName: null,
    counterparty: null,
    client: CLIENT,
    responsibleLawyer: LAWYER,
  });
}

describe('DocumentsCoverPdfAdapter', () => {
  it('hands the boxes of the sheet to documents as they are and returns its PDF', async () => {
    const generate = new RecordingGenerateCoverPdf();
    const adapter = new DocumentsCoverPdfAdapter(generate as unknown as GenerateCoverPdf);
    const sheet = aSheet(JurisdictionCode.CRIMINAL);

    const pdf = await adapter.render(sheet);

    expect(Buffer.from(pdf).toString()).toBe('%PDF-fake');
    expect(generate.received).toEqual([
      {
        jurisdiction: 'CRIMINAL',
        sacNumber: sheet.sacNumber,
        caption: sheet.caption,
        plaintiff: sheet.plaintiff,
        defendant: sheet.defendant,
        interveningBody: sheet.interveningBody,
        observations: sheet.observations,
      },
    ]);
  });

  it.each([
    [JurisdictionCode.CRIMINAL, 'CRIMINAL'],
    [JurisdictionCode.ADMINISTRATIVE, 'ADMINISTRATIVE'],
    [JurisdictionCode.AMPARO, 'AMPARO'],
  ])('translates the jurisdiction %s to the one of documents (CA-24.2)', async (jurisdiction, expected) => {
    const generate = new RecordingGenerateCoverPdf();
    const adapter = new DocumentsCoverPdfAdapter(generate as unknown as GenerateCoverPdf);

    await adapter.render(aSheet(jurisdiction));

    expect(generate.received[0].jurisdiction).toBe(expected);
  });
});
