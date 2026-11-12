import { PDFDocument } from '@cantoo/pdf-lib';

/** A real 1 × 1 PNG, the smallest image the PDF library embeds. */
export const TINY_PNG = Buffer.from(
  'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==',
  'base64',
);

/** A real 1 × 1 JPEG. */
export const TINY_JPG = Buffer.from(
  '/9j/4AAQSkZJRgABAQEASABIAAD/2wBDAP//////////////////////////////////////////////////////////////////////////////////////wgALCAABAAEBAREA/8QAFBABAAAAAAAAAAAAAAAAAAAAAP/aAAgBAQABPxA=',
  'base64',
);

/** A real PDF with that many A4 pages, for the documents a case file joins (HU25). */
export async function aPdf(pages: number): Promise<Buffer> {
  const pdf = await PDFDocument.create();
  for (let i = 0; i < pages; i += 1) {
    pdf.addPage([595.28, 841.89]);
  }
  return Buffer.from(await pdf.save());
}

/** How many pages a PDF has. */
export async function pageCountOf(content: Uint8Array): Promise<number> {
  return (await PDFDocument.load(content)).getPageCount();
}
