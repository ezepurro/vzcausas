import { readFile } from 'node:fs/promises';
import { join } from 'node:path';
import { PDFDocument, PDFFont, PDFPage, StandardFonts, rgb } from '@cantoo/pdf-lib';
import { Injectable } from '@nestjs/common';
import {
  CoverJurisdiction,
  CoverPdfBoxes,
  CoverPdfRenderer,
} from '../../core/domain/ports/cover-pdf-renderer.port';

/** A4 in points. */
const PAGE_WIDTH = 595.28;
const PAGE_HEIGHT = 841.89;

/**
 * The template is a 1241 × 1754 px image (A4 at 150 dpi): the logo, the six labels and
 * the six frames. The boxes below are measured on it, in pixels from the top left, and
 * converted to points when drawn. If the studio changes the template, only these move.
 */
const IMAGE_WIDTH_PX = 1241;
const SCALE = PAGE_WIDTH / IMAGE_WIDTH_PX;

interface Box {
  left: number;
  top: number;
  right: number;
  bottom: number;
}

const SAC_BOX: Box = { left: 798, top: 354, right: 1152, bottom: 442 };
const CAPTION_BOX: Box = { left: 228, top: 492, right: 1152, bottom: 669 };
const PLAINTIFF_BOX: Box = { left: 228, top: 734, right: 1152, bottom: 911 };
const DEFENDANT_BOX: Box = { left: 228, top: 975, right: 1152, bottom: 1153 };
const INTERVENING_BODY_BOX: Box = { left: 228, top: 1217, right: 1152, bottom: 1394 };
const OBSERVATIONS_BOX: Box = { left: 228, top: 1459, right: 1152, bottom: 1636 };

/**
 * The template of each jurisdiction (CA-24.2), a file in `assets/`. The three are the
 * same image today (the studio's three Word templates share it), but the choice is made
 * per jurisdiction so that giving one its own sheet is a new file and a line here. The
 * boxes below are measured on this image: a template with another layout needs its own.
 */
const TEMPLATE_BY_JURISDICTION: Record<CoverJurisdiction, string> = {
  CRIMINAL: 'cover-background.png',
  ADMINISTRATIVE: 'cover-background.png',
  AMPARO: 'cover-background.png',
};

const PADDING = 7;
const FONT_SIZES = [14, 12, 10, 8];
const LINE_HEIGHT_FACTOR = 1.25;
const INK = rgb(0, 0, 0);

/**
 * Draws the cover sheet with `@cantoo/pdf-lib` (decision 7, `IMPLEMENTACION_CARATULA.md`):
 * the studio's template as the page background and the text written over its frames.
 * It generates on every call and stores nothing (CA-24.1).
 *
 * The text shrinks, down to 8 pt, until it fits its frame; past that it is cut at the
 * last line that fits, because a frame that overflows is worse than a truncated one.
 */
@Injectable()
export class PdfLibCoverRenderer implements CoverPdfRenderer {
  private readonly backgrounds = new Map<string, Promise<Buffer>>();

  /** The template file of a jurisdiction (CA-24.2). */
  templateFor(jurisdiction: CoverJurisdiction): string {
    return TEMPLATE_BY_JURISDICTION[jurisdiction];
  }

  async render(boxes: CoverPdfBoxes): Promise<Uint8Array> {
    const pdf = await PDFDocument.create();
    const page = pdf.addPage([PAGE_WIDTH, PAGE_HEIGHT]);
    const font = await pdf.embedFont(StandardFonts.Helvetica);

    const image = await pdf.embedPng(await this.loadBackground(this.templateFor(boxes.jurisdiction)));
    page.drawImage(image, { x: 0, y: 0, width: PAGE_WIDTH, height: PAGE_HEIGHT });

    this.write(page, font, SAC_BOX, [boxes.sacNumber], { centered: true });
    this.write(page, font, CAPTION_BOX, [boxes.caption]);
    this.write(page, font, PLAINTIFF_BOX, boxes.plaintiff);
    this.write(page, font, DEFENDANT_BOX, boxes.defendant);
    this.write(page, font, INTERVENING_BODY_BOX, boxes.interveningBody);
    this.write(page, font, OBSERVATIONS_BOX, boxes.observations);

    return pdf.save();
  }

  /** Each template is read once: it is the same image on every emission. A failed read is not kept. */
  private loadBackground(file: string): Promise<Buffer> {
    let background = this.backgrounds.get(file);
    if (!background) {
      background = readFile(join(__dirname, 'assets', file)).catch((error) => {
        this.backgrounds.delete(file);
        throw error;
      });
      this.backgrounds.set(file, background);
    }
    return background;
  }

  private write(
    page: PDFPage,
    font: PDFFont,
    box: Box,
    lines: readonly string[],
    options: { centered?: boolean } = {},
  ): void {
    const text = lines.map((line) => this.encodable(font, line));
    const width = (box.right - box.left) * SCALE - 2 * PADDING;
    const height = (box.bottom - box.top) * SCALE - 2 * PADDING;

    const { size, wrapped } = this.fit(font, text, width, height);
    if (wrapped.length === 0) {
      return;
    }

    const lineHeight = size * LINE_HEIGHT_FACTOR;
    const frameTop = PAGE_HEIGHT - box.top * SCALE;
    const blockHeight = wrapped.length * lineHeight;
    const topOffset = options.centered ? (height + 2 * PADDING - blockHeight) / 2 : PADDING;

    wrapped.forEach((line, index) => {
      const y = frameTop - topOffset - size - index * lineHeight;
      page.drawText(line, { x: box.left * SCALE + PADDING, y, size, font, color: INK });
    });
  }

  /** The biggest size at which every line fits; at the smallest one, the lines that fit. */
  private fit(font: PDFFont, lines: string[], width: number, height: number): { size: number; wrapped: string[] } {
    for (const size of FONT_SIZES) {
      const wrapped = lines.flatMap((line) => this.wrap(font, line, size, width));
      if (wrapped.length * size * LINE_HEIGHT_FACTOR <= height) {
        return { size, wrapped };
      }
    }

    const size = FONT_SIZES[FONT_SIZES.length - 1];
    const wrapped = lines.flatMap((line) => this.wrap(font, line, size, width));
    return { size, wrapped: wrapped.slice(0, Math.max(0, Math.floor(height / (size * LINE_HEIGHT_FACTOR)))) };
  }

  /** Greedy word wrap; a word wider than the frame is cut where it overflows. */
  private wrap(font: PDFFont, line: string, size: number, width: number): string[] {
    if (line === '') {
      return [''];
    }

    const result: string[] = [];
    let current = '';
    for (const word of line.split(/\s+/).filter((w) => w !== '')) {
      for (const piece of this.breakLongWord(font, word, size, width)) {
        const candidate = current === '' ? piece : `${current} ${piece}`;
        if (current !== '' && font.widthOfTextAtSize(candidate, size) > width) {
          result.push(current);
          current = piece;
        } else {
          current = candidate;
        }
      }
    }
    if (current !== '') {
      result.push(current);
    }
    return result;
  }

  private breakLongWord(font: PDFFont, word: string, size: number, width: number): string[] {
    if (font.widthOfTextAtSize(word, size) <= width) {
      return [word];
    }

    const pieces: string[] = [];
    let current = '';
    for (const char of word) {
      if (current !== '' && font.widthOfTextAtSize(current + char, size) > width) {
        pieces.push(current);
        current = char;
      } else {
        current += char;
      }
    }
    return [...pieces, current];
  }

  /** The standard fonts cannot encode every character; a stray one becomes `?` instead of failing the emission. */
  private encodable(font: PDFFont, text: string): string {
    const supported = new Set(font.getCharacterSet());
    return [...text].map((char) => (supported.has(char.codePointAt(0) as number) ? char : '?')).join('');
  }
}
