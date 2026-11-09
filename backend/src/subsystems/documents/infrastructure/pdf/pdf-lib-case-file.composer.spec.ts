import { PDFDocument } from '@cantoo/pdf-lib';
import { DocumentNotConvertibleError } from '../../core/domain/errors/documents.errors';
import { TINY_JPG, TINY_PNG, aPdf } from '../../core/test-support/pdf-fixtures';
import { PdfLibCaseFileComposer } from './pdf-lib-case-file.composer';

/* HU25 · Unir el expediente: los PDF con todas sus hojas, cada imagen en su hoja A4 (CA-25.1, CA-25.4). */

const A4: [number, number] = [595.28, 841.89];

/** A PDF whose single page has a size of its own, to tell the parts apart in the result. */
async function aPdfOfSize(width: number, height: number): Promise<Buffer> {
  const pdf = await PDFDocument.create();
  pdf.addPage([width, height]);
  return Buffer.from(await pdf.save());
}

describe('PdfLibCaseFileComposer', () => {
  const composer = new PdfLibCaseFileComposer();

  it('une en orden: la carátula, un PDF de 2 hojas y una imagen en su propia hoja A4', async () => {
    const cover = await aPdfOfSize(300, 400);

    const composed = await composer.compose([
      { kind: 'PDF', content: cover },
      { kind: 'PDF', content: await aPdf(2) },
      { kind: 'IMAGE', mimeType: 'image/jpeg', content: TINY_JPG },
    ]);

    expect(composed.pageCount).toBe(4);
    const pages = (await PDFDocument.load(composed.content)).getPages().map((page) => {
      const { width, height } = page.getSize();
      return [Math.round(width), Math.round(height)];
    });
    expect(pages).toEqual([[300, 400], ...Array(3).fill(A4.map(Math.round))]);
  });

  it('acepta PNG igual que JPG', async () => {
    const composed = await composer.compose([{ kind: 'IMAGE', mimeType: 'image/png', content: TINY_PNG }]);

    expect(composed.pageCount).toBe(1);
  });

  it.each([
    ['un PDF que no se puede abrir', { kind: 'PDF' as const, content: Buffer.from('no es un pdf') }],
    ['una imagen rota', { kind: 'IMAGE' as const, mimeType: 'image/png' as const, content: Buffer.from('nada') }],
  ])('%s responde DOCUMENT_NOT_CONVERTIBLE', async (_label, part) => {
    await expect(composer.compose([part])).rejects.toBeInstanceOf(DocumentNotConvertibleError);
  });
});
