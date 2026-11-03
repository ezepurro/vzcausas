import { PDFDocument, PDFImage } from '@cantoo/pdf-lib';
import { Injectable } from '@nestjs/common';
import { DocumentNotConvertibleError } from '../../core/domain/errors/documents.errors';
import {
  CaseFilePdfComposer,
  CaseFilePdfPart,
  ComposedPdf,
} from '../../core/domain/ports/case-file-pdf-composer.port';

/** A4 in points, as the cover sheet. */
const PAGE_WIDTH = 595.28;
const PAGE_HEIGHT = 841.89;
/** Margin around an image on its page: 1.5 cm. */
const IMAGE_MARGIN = 42.52;

/**
 * {@link CaseFilePdfComposer} with `@cantoo/pdf-lib`, the library of the cover
 * sheet (`IMPLEMENTACION_CARATULA.md`, decision 7). Each PDF part brings all its
 * pages with `copyPages`; each image gets an A4 page of its own, scaled to fit
 * inside the margin without distortion and centred (CA-25.4). It never enlarges
 * a small image: a photo of a receipt is not blown up to the page.
 */
@Injectable()
export class PdfLibCaseFileComposer implements CaseFilePdfComposer {
  async compose(parts: readonly CaseFilePdfPart[]): Promise<ComposedPdf> {
    const result = await PDFDocument.create();

    for (const part of parts) {
      if (part.kind === 'PDF') {
        const source = await this.open(part.content);
        const pages = await result.copyPages(source, source.getPageIndices());
        pages.forEach((page) => result.addPage(page));
      } else {
        const image = await this.embed(result, part);
        const scale = Math.min(
          1,
          (PAGE_WIDTH - 2 * IMAGE_MARGIN) / image.width,
          (PAGE_HEIGHT - 2 * IMAGE_MARGIN) / image.height,
        );
        const width = image.width * scale;
        const height = image.height * scale;
        result.addPage([PAGE_WIDTH, PAGE_HEIGHT]).drawImage(image, {
          x: (PAGE_WIDTH - width) / 2,
          y: (PAGE_HEIGHT - height) / 2,
          width,
          height,
        });
      }
    }

    return { content: Buffer.from(await result.save()), pageCount: result.getPageCount() };
  }

  /** A file that says it is a PDF but cannot be opened cannot go into the case file. */
  private async open(content: Uint8Array): Promise<PDFDocument> {
    try {
      return await PDFDocument.load(content, { ignoreEncryption: true });
    } catch {
      throw new DocumentNotConvertibleError();
    }
  }

  private async embed(result: PDFDocument, part: Extract<CaseFilePdfPart, { kind: 'IMAGE' }>): Promise<PDFImage> {
    try {
      return part.mimeType === 'image/png' ? await result.embedPng(part.content) : await result.embedJpg(part.content);
    } catch {
      throw new DocumentNotConvertibleError();
    }
  }
}
