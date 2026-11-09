import { existsSync } from 'node:fs';
import { join } from 'node:path';
import { PDFDocument } from '@cantoo/pdf-lib';
import { COVER_JURISDICTIONS, CoverPdfBoxes } from '../../core/domain/ports/cover-pdf-renderer.port';
import { PdfLibCoverRenderer } from './pdf-lib-cover.renderer';

const A4_WIDTH_PT = 595.28;
const A4_HEIGHT_PT = 841.89;

function someBoxes(overrides: Partial<CoverPdfBoxes> = {}): CoverPdfBoxes {
  return {
    jurisdiction: 'CRIMINAL',
    sacNumber: '13284571',
    caption: 'SÁNCHEZ, CELIA P.S.A. ROBO CALIFICADO',
    plaintiff: [],
    defendant: ['SÁNCHEZ CELIA', 'DEFENSOR: DR. FERNANDO VAZQUEZ'],
    interveningBody: ['JUZGADO DE CONTROL N° 3 · CÓRDOBA', 'SECRETARIO/A: DRA. VERÓNICA LEDESMA'],
    observations: [],
    ...overrides,
  };
}

describe('PdfLibCoverRenderer', () => {
  const renderer = new PdfLibCoverRenderer();

  it('produces a PDF of a single A4 page (CA-24.1)', async () => {
    const bytes = await renderer.render(someBoxes());

    expect(Buffer.from(bytes.subarray(0, 5)).toString()).toBe('%PDF-');
    const pdf = await PDFDocument.load(bytes);
    expect(pdf.getPageCount()).toBe(1);
    const { width, height } = pdf.getPage(0).getSize();
    expect(width).toBeCloseTo(A4_WIDTH_PT, 1);
    expect(height).toBeCloseTo(A4_HEIGHT_PT, 1);
  });

  it.each(COVER_JURISDICTIONS)('has a template for %s and draws a page with it (CA-24.2)', async (jurisdiction) => {
    const template = renderer.templateFor(jurisdiction);

    expect(existsSync(join(__dirname, 'assets', template))).toBe(true);
    const bytes = await renderer.render(someBoxes({ jurisdiction }));
    expect((await PDFDocument.load(bytes)).getPageCount()).toBe(1);
  });

  it('draws a sheet with every box blank without failing', async () => {
    const bytes = await renderer.render(
      someBoxes({ sacNumber: '', caption: '', defendant: [], interveningBody: [] }),
    );

    expect((await PDFDocument.load(bytes)).getPageCount()).toBe(1);
  });

  it('keeps one page when a box holds far more text than it fits', async () => {
    const long = 'AUTOS MUY LARGOS '.repeat(80);

    const bytes = await renderer.render(someBoxes({ caption: long, plaintiff: Array(30).fill(long) }));

    expect((await PDFDocument.load(bytes)).getPageCount()).toBe(1);
  });
});
