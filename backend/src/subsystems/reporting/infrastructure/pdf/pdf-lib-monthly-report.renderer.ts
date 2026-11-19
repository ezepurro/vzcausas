import { PDFDocument, PDFFont, PDFPage, RGB, StandardFonts, rgb } from '@cantoo/pdf-lib';
import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import {
  MonthlyReportPdfRenderer,
  ReportIssue,
} from '../../core/application/ports/monthly-report-pdf.renderer.port';
import { MonthlyReport } from '../../core/domain/report/monthly-report';
import { MonthlyReportNarrative as Text } from '../../core/domain/report/monthly-report-narrative';

/** A4 in points (210 × 297 mm). The template of the contract is 794 × 1123 px at 96 dpi: 1 px = 0.75 pt. */
const PAGE_WIDTH = 595.28;
const PAGE_HEIGHT = 841.89;
const MARGIN_TOP = 36;
const MARGIN_SIDE = 42;
/** The footer sits 28 px (21 pt) from the bottom edge. */
const FOOTER_BASELINE = 21;
const CONTENT_BOTTOM = 56;
const CONTENT_WIDTH = PAGE_WIDTH - 2 * MARGIN_SIDE;

const hex = (value: string): RGB => {
  const n = parseInt(value.slice(1), 16);
  return rgb(((n >> 16) & 255) / 255, ((n >> 8) & 255) / 255, (n & 255) / 255);
};

/** The palette the contract fixes (§3.13, "Lo que la plantilla fija"). */
const INK = hex('#0F172A');
const MUTED = hex('#5A6560');
const LINE = hex('#DDE2DC');
const HIGHLIGHT = hex('#EEF3EC');
const GREEN = hex('#406640');
const AMBER_TEXT = hex('#7A5C1E');
const RED = hex('#8E1F19');
const JURISDICTION_COLOR: Record<string, RGB> = {
  CRIMINAL: hex('#406640'),
  ADMINISTRATIVE: hex('#A8894C'),
  AMPARO: hex('#4F6A8A'),
};
const JURISDICTION_LABEL: Record<string, string> = {
  CRIMINAL: 'Penal',
  ADMINISTRATIVE: 'Administrativo',
  AMPARO: 'Amparo',
};
const BAND: Record<string, { label: string; color: RGB }> = {
  UNDER_50: { label: 'Menos del 50 %', color: hex('#406640') },
  FROM_50_TO_70: { label: 'Entre 50 % y 70 %', color: hex('#9DB59A') },
  FROM_70_TO_90: { label: 'Entre 70 % y 90 %', color: hex('#A8894C') },
  FROM_90: { label: 'Más del 90 %', color: hex('#8E1F19') },
};

const ROW_HEIGHT = 16;
const TEXT_SIZE = 10;
const TABLE_SIZE = 9;
const LINE_HEIGHT = 14;

type Align = 'left' | 'right';
type Column = { header: string; share: number; align?: Align };
type CellStyle = { bold?: boolean; mono?: boolean; color?: RGB; dot?: RGB };
type Cell = string | ({ text: string } & CellStyle);
type RowStyle = { header?: boolean; total?: boolean; highlighted?: boolean };

type Fonts = { regular: PDFFont; bold: PDFFont; mono: PDFFont; monoBold: PDFFont };

/**
 * Draws "Reporte mensual de gestión de causas" (HU43, §3.13) with `@cantoo/pdf-lib`,
 * the library `documents` already uses (D-120): A4, tables, bars and text, from the
 * **complete** set of the report's data (D-141). It generates on every call and
 * stores nothing.
 *
 * The visual reference is `docs/prototypes/reporte-mensual-pdf.html`. The template
 * names Figtree and Roboto Mono, whose files the backend does not ship: the standard
 * Helvetica and Courier replace them, as the contract allows ("incluir los archivos
 * o reemplazarlos"). The standard fonts cannot draw the real minus sign (U+2212), so
 * it is drawn as an en dash.
 */
@Injectable()
export class PdfLibMonthlyReportRenderer implements MonthlyReportPdfRenderer {
  private readonly timeZone: string;

  constructor(config: ConfigService) {
    this.timeZone = config.getOrThrow<string>('APP_TIMEZONE');
  }

  async render(report: MonthlyReport, issue: ReportIssue): Promise<Uint8Array> {
    const pdf = await PDFDocument.create();
    const fonts: Fonts = {
      regular: await pdf.embedFont(StandardFonts.Helvetica),
      bold: await pdf.embedFont(StandardFonts.HelveticaBold),
      mono: await pdf.embedFont(StandardFonts.Courier),
      monoBold: await pdf.embedFont(StandardFonts.CourierBold),
    };
    const sheet = new Sheet(pdf, fonts, Text.periodLabel(report.data.period));

    this.draw(sheet, report, issue);

    sheet.drawFooters();
    return pdf.save();
  }

  private draw(sheet: Sheet, report: MonthlyReport, issue: ReportIssue): void {
    const { data } = report;
    const inProgress = report.status === 'IN_PROGRESS';

    sheet.title(Text.periodLabel(data.period), inProgress ? `Mes en curso · datos al ${Text.date(data.dataAsOf)}` : null);
    sheet.meta([
      ['Período', Text.periodLabel(data.period)],
      ['Datos al', Text.date(data.dataAsOf)],
      ['Emitido por', issue.by],
      ['Emitido el', this.issuedAt(issue.at)],
    ]);

    sheet.section('1. Resumen del período');
    Text.summary(report).forEach((paragraph) => sheet.paragraph(paragraph));

    sheet.section('2. Causas por fuero', 'Cuadro 1 · Movimiento del mes y existencia al cierre.');
    PdfLibMonthlyReportRenderer.jurisdictionTable(sheet, report);

    sheet.section(
      '3. Carga por abogado responsable',
      `Cuadro 2 · Causas activas al cierre. Promedio del estudio: ${Text.decimal(data.summary.averagePerLawyer)} causas por abogado.`,
    );
    PdfLibMonthlyReportRenderer.lawyerTable(sheet, report);

    sheet.section(
      '4. Causas ingresadas y archivadas en el año',
      'Cuadro 3 · Causas ingresadas y archivadas por mes, de enero al período informado.',
    );
    PdfLibMonthlyReportRenderer.monthlyTable(sheet, report);

    sheet.section(
      '5. Prescripción de la acción',
      'Cuadro 4 · Causas penales activas según el porcentaje del plazo transcurrido.',
    );
    PdfLibMonthlyReportRenderer.prescription(sheet, report);

    sheet.section('6. Plazos procesales del mes');
    sheet.paragraph(Text.deadlines(report));
  }

  /** "Emitido el": `dd/mm/aaaa · hh:mm`, in the study's local time. */
  private issuedAt(at: Date): string {
    const parts = new Intl.DateTimeFormat('es-AR', {
      timeZone: this.timeZone,
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
      hourCycle: 'h23',
    }).formatToParts(at);
    const get = (type: Intl.DateTimeFormatPartTypes) => parts.find((p) => p.type === type)?.value ?? '';
    return `${get('day')}/${get('month')}/${get('year')} · ${get('hour')}:${get('minute')}`;
  }

  private static jurisdictionTable(sheet: Sheet, report: MonthlyReport): void {
    const rows = report.data.byJurisdiction;
    const total = (pick: (row: (typeof rows)[number]) => number) => String(rows.reduce((sum, row) => sum + pick(row), 0));
    const columns: Column[] = [
      { header: 'Fuero', share: 0.3 },
      { header: 'Al inicio', share: 0.14, align: 'right' },
      { header: 'Ingresadas', share: 0.14, align: 'right' },
      { header: 'Archivadas', share: 0.14, align: 'right' },
      { header: 'Al cierre', share: 0.14, align: 'right' },
      { header: '% del total', share: 0.14, align: 'right' },
    ];
    sheet.table(columns, [
      ...rows.map((row): { cells: Cell[] } => ({
        cells: [
          { text: JURISDICTION_LABEL[row.jurisdiction], dot: JURISDICTION_COLOR[row.jurisdiction] },
          { text: String(row.atStart), mono: true },
          { text: String(row.admitted), mono: true },
          { text: String(row.archived), mono: true },
          { text: String(row.atEnd), mono: true, bold: true },
          { text: `${row.percentage} %`, mono: true },
        ],
      })),
      {
        style: { total: true },
        cells: [
          'Total',
          { text: total((r) => r.atStart), mono: true },
          { text: total((r) => r.admitted), mono: true },
          { text: total((r) => r.archived), mono: true },
          { text: total((r) => r.atEnd), mono: true },
          { text: '100 %', mono: true },
        ],
      },
    ]);
  }

  private static lawyerTable(sheet: Sheet, report: MonthlyReport): void {
    const { lawyers, unassigned } = report.data;
    const columns: Column[] = [
      { header: 'Abogado', share: 0.3 },
      { header: 'Matrícula', share: 0.14 },
      { header: 'Penal', share: 0.1, align: 'right' },
      { header: 'Adm.', share: 0.1, align: 'right' },
      { header: 'Amparo', share: 0.1, align: 'right' },
      { header: 'Total', share: 0.12, align: 'right' },
      { header: 'Vs. promedio', share: 0.14, align: 'right' },
    ];
    const rows = lawyers.map((load): { cells: Cell[] } => ({
      cells: [
        { text: Text.lawyerName(load.lawyer), bold: true },
        { text: load.lawyer.registrationNumber ?? '—', mono: true, color: MUTED },
        { text: String(load.criminal), mono: true },
        { text: String(load.administrative), mono: true },
        { text: String(load.amparo), mono: true },
        { text: String(load.total), mono: true, bold: true },
        {
          text: Text.signedDecimal(load.differenceFromAverage),
          mono: true,
          color: load.differenceFromAverage >= 2 ? AMBER_TEXT : MUTED,
          bold: load.differenceFromAverage >= 2,
        },
      ],
    }));
    // D-145: the orphaned cases are only counted, and have no "Vs. promedio".
    if (unassigned.total > 0) {
      rows.push({
        cells: [
          { text: 'Sin asignar', bold: true },
          { text: '—', mono: true, color: MUTED },
          { text: String(unassigned.criminal), mono: true },
          { text: String(unassigned.administrative), mono: true },
          { text: String(unassigned.amparo), mono: true },
          { text: String(unassigned.total), mono: true, bold: true },
          '',
        ],
      });
    }
    sheet.table(columns, rows);
  }

  private static monthlyTable(sheet: Sheet, report: MonthlyReport): void {
    const columns: Column[] = [
      { header: 'Mes', share: 0.17 },
      { header: 'Ingresadas', share: 0.12, align: 'right' },
      { header: 'Archivadas', share: 0.12, align: 'right' },
      { header: 'Saldo', share: 0.1, align: 'right' },
      { header: 'Activas al cierre', share: 0.15, align: 'right' },
      { header: 'Ingresadas / archivadas', share: 0.34 },
    ];
    const values = report.monthly.flatMap((m) => [m.admitted, m.archived]).filter((v): v is number => v !== null);
    const max = Math.max(1, ...values);
    sheet.table(
      columns,
      report.monthly.map((month) => {
        const style: RowStyle = { highlighted: month.period === report.data.period };
        if (month.admitted === null || month.archived === null) {
          return { style, cells: [Text.monthName(month.period), { text: 'Sin datos', color: MUTED }, '', '', '', ''] };
        }
        return {
          style,
          cells: [
            Text.monthName(month.period),
            { text: String(month.admitted), mono: true },
            { text: String(month.archived), mono: true },
            { text: Text.signed(month.balance ?? 0), mono: true },
            { text: String(month.activeAtEnd ?? 0), mono: true, bold: true },
            { text: '', bars: [month.admitted / max, month.archived / max] } satisfies BarCell,
          ],
        };
      }),
    );
  }

  private static prescription(sheet: Sheet, report: MonthlyReport): void {
    const { prescription } = report.data;
    if (prescription.cases === 0) {
      sheet.paragraph('No hay causas penales activas con prescripción al cierre del período.');
      return;
    }
    sheet.table(
      [
        { header: 'Tramo', share: 0.5 },
        { header: 'Causas', share: 0.2, align: 'right' },
        { header: '% de las penales', share: 0.3, align: 'right' },
      ],
      prescription.bands.map((band) => ({
        cells: [
          { text: BAND[band.band].label, dot: BAND[band.band].color },
          { text: String(band.cases), mono: true },
          { text: `${band.percentage} %`, mono: true },
        ],
      })),
    );
    sheet.gap(8);
    sheet.paragraph('Causas con más del 70 % del plazo transcurrido al cierre del período:');
    if (prescription.alerts.length === 0) {
      sheet.paragraph('Ninguna.', MUTED);
      return;
    }
    sheet.table(
      [
        { header: 'SAC', share: 0.14 },
        { header: 'Carátula', share: 0.42 },
        { header: 'Responsable', share: 0.28 },
        { header: 'Avance', share: 0.16, align: 'right' },
      ],
      prescription.alerts.map((alert) => ({
        cells: [
          { text: alert.sacNumber ?? '—', mono: true },
          alert.caption,
          // D-145: an orphaned case is listed with "Sin asignar".
          Text.responsible(alert.responsibleLawyer),
          {
            text: alert.expired ? 'Prescripta' : `${alert.elapsedPercentage} %`,
            mono: true,
            bold: true,
            color: alert.expired || alert.elapsedPercentage >= 90 ? RED : AMBER_TEXT,
          },
        ],
      })),
    );
  }
}

/** A cell that also draws two bars (admitted and archived) in its column. */
type BarCell = { text: string; bars: [number, number] };

/**
 * The sheet being drawn: a cursor going down the page, a header and a footer on
 * every page, and the few pieces the report is made of. A new page starts when the
 * next piece does not fit; a table repeats its header there.
 */
class Sheet {
  private page!: PDFPage;
  private y = 0;
  private readonly pages: PDFPage[] = [];

  constructor(
    private readonly pdf: PDFDocument,
    private readonly fonts: Fonts,
    private readonly periodLabel: string,
  ) {
    this.newPage();
  }

  title(periodLabel: string, badge: string | null): void {
    this.y -= 6;
    this.write('REPORTE MENSUAL DE GESTIÓN DE CAUSAS', MARGIN_SIDE, this.y - 9, 8.5, this.fonts.bold, GREEN);
    this.y -= 34;
    this.write(periodLabel, MARGIN_SIDE, this.y, 22, this.fonts.bold, INK);
    this.y -= 12;
    if (badge !== null) {
      const width = this.width(badge, 8.5, this.fonts.bold) + 14;
      this.page.drawRectangle({ x: MARGIN_SIDE, y: this.y - 14, width, height: 16, color: HIGHLIGHT });
      this.write(badge, MARGIN_SIDE + 7, this.y - 9, 8.5, this.fonts.bold, GREEN);
      this.y -= 20;
    }
    this.y -= 6;
  }

  /** The box with "Período", "Datos al", "Emitido por" and "Emitido el". */
  meta(entries: [string, string][]): void {
    const height = 38;
    this.ensure(height + 12);
    this.page.drawRectangle({
      x: MARGIN_SIDE,
      y: this.y - height,
      width: CONTENT_WIDTH,
      height,
      borderColor: LINE,
      borderWidth: 0.75,
    });
    const cellWidth = CONTENT_WIDTH / entries.length;
    entries.forEach(([label, value], index) => {
      const x = MARGIN_SIDE + index * cellWidth + 8;
      this.write(label.toUpperCase(), x, this.y - 13, 7, this.fonts.bold, MUTED);
      this.write(this.fit(value, 9.5, this.fonts.bold, cellWidth - 14), x, this.y - 28, 9.5, this.fonts.bold, INK);
    });
    this.y -= height + 14;
  }

  section(heading: string, subtitle?: string): void {
    this.ensure(subtitle ? 64 : 48);
    this.y -= 6;
    this.write(heading, MARGIN_SIDE, this.y - 11, 12, this.fonts.bold, INK);
    this.y -= 18;
    if (subtitle) {
      this.write(subtitle, MARGIN_SIDE, this.y - 8, 8.5, this.fonts.regular, MUTED);
      this.y -= 14;
    }
    this.y -= 2;
  }

  paragraph(text: string, color: RGB = INK): void {
    for (const line of this.wrap(text, TEXT_SIZE, this.fonts.regular, CONTENT_WIDTH)) {
      this.ensure(LINE_HEIGHT);
      this.write(line, MARGIN_SIDE, this.y - 10, TEXT_SIZE, this.fonts.regular, color);
      this.y -= LINE_HEIGHT;
    }
    this.y -= 4;
  }

  gap(height: number): void {
    this.y -= height;
  }

  table(columns: Column[], rows: { cells: (Cell | BarCell)[]; style?: RowStyle }[]): void {
    this.tableRow(columns, columns.map((c) => c.header), { header: true });
    for (const row of rows) {
      if (this.y - ROW_HEIGHT < CONTENT_BOTTOM) {
        this.newPage();
        this.tableRow(columns, columns.map((c) => c.header), { header: true });
      }
      this.tableRow(columns, row.cells, row.style ?? {});
    }
    this.y -= 6;
  }

  /** "VZ Causas · Reporte mensual de gestión · {período}" and "Página X de N", on every page. */
  drawFooters(): void {
    const total = this.pages.length;
    this.pages.forEach((page, index) => {
      page.drawLine({
        start: { x: MARGIN_SIDE, y: FOOTER_BASELINE + 12 },
        end: { x: PAGE_WIDTH - MARGIN_SIDE, y: FOOTER_BASELINE + 12 },
        thickness: 0.5,
        color: LINE,
      });
      const left = `VZ Causas · Reporte mensual de gestión · ${this.periodLabel}`;
      const right = `Página ${index + 1} de ${total}`;
      page.drawText(this.clean(left, this.fonts.regular), {
        x: MARGIN_SIDE,
        y: FOOTER_BASELINE,
        size: 8,
        font: this.fonts.regular,
        color: MUTED,
      });
      page.drawText(right, {
        x: PAGE_WIDTH - MARGIN_SIDE - this.width(right, 8, this.fonts.mono),
        y: FOOTER_BASELINE,
        size: 8,
        font: this.fonts.mono,
        color: MUTED,
      });
    });
  }

  private tableRow(columns: Column[], cells: (Cell | BarCell)[], style: RowStyle): void {
    const top = this.y;
    if (style.highlighted) {
      this.page.drawRectangle({ x: MARGIN_SIDE, y: top - ROW_HEIGHT, width: CONTENT_WIDTH, height: ROW_HEIGHT, color: HIGHLIGHT });
    }
    let x = MARGIN_SIDE;
    columns.forEach((column, index) => {
      const width = column.share * CONTENT_WIDTH;
      const cell = cells[index] ?? '';
      const spec: { text: string } & CellStyle & { bars?: [number, number] } =
        typeof cell === 'string' ? { text: cell } : cell;
      const bold = style.header || style.total || style.highlighted || spec.bold === true;
      const mono = spec.mono === true && !style.header;
      const font = mono ? (bold ? this.fonts.monoBold : this.fonts.mono) : bold ? this.fonts.bold : this.fonts.regular;
      const size = style.header ? 8 : TABLE_SIZE;
      const color = spec.color ?? (style.header ? MUTED : INK);
      const padding = 4;
      const dotShift = spec.dot ? 12 : 0;
      if (spec.dot) {
        this.page.drawRectangle({ x: x + padding, y: top - 12, width: 6, height: 6, color: spec.dot });
      }
      if (spec.bars) {
        const barMax = width - 2 * padding;
        this.page.drawRectangle({ x: x + padding, y: top - 7, width: Math.max(0.5, barMax * spec.bars[0]), height: 3, color: GREEN });
        this.page.drawRectangle({ x: x + padding, y: top - 11, width: Math.max(0.5, barMax * spec.bars[1]), height: 3, color: hex('#9DB59A') });
      } else {
        const text = this.fit(style.header ? spec.text.toUpperCase() : spec.text, size, font, width - 2 * padding - dotShift);
        const textX =
          column.align === 'right'
            ? x + width - padding - this.width(text, size, font)
            : x + padding + dotShift;
        this.write(text, textX, top - 11, size, font, color);
      }
      x += width;
    });
    const lineColor = style.total || style.header ? INK : LINE;
    this.page.drawLine({
      start: { x: MARGIN_SIDE, y: top - ROW_HEIGHT },
      end: { x: MARGIN_SIDE + CONTENT_WIDTH, y: top - ROW_HEIGHT },
      thickness: style.total || style.header ? 0.9 : 0.5,
      color: lineColor,
    });
    this.y -= ROW_HEIGHT;
  }

  /** Starts a new page when `height` does not fit in what is left of this one. */
  private ensure(height: number): void {
    if (this.y - height < CONTENT_BOTTOM) this.newPage();
  }

  private newPage(): void {
    this.page = this.pdf.addPage([PAGE_WIDTH, PAGE_HEIGHT]);
    this.pages.push(this.page);
    this.drawHeader();
  }

  /** The logo (the "VZ" monogram of the app), the study's name and the period. */
  private drawHeader(): void {
    const top = PAGE_HEIGHT - MARGIN_TOP;
    const scale = 28.5 / 60;
    this.page.drawSvgPath('M2 2h12l10 26L34 2h12L28 40H16L2 2z', { x: MARGIN_SIDE, y: top, scale, color: GREEN });
    this.page.drawSvgPath('M38 2h20L40 34h18v6H30L48 8H38V2z', {
      x: MARGIN_SIDE,
      y: top,
      scale,
      color: GREEN,
      opacity: 0.55,
    });
    this.write('Vázquez y Zárate', MARGIN_SIDE + 36, top - 17, 11, this.fonts.bold, INK);
    const right = this.periodLabel;
    this.write(right, PAGE_WIDTH - MARGIN_SIDE - this.width(right, 10, this.fonts.regular), top - 17, 10, this.fonts.regular, MUTED);
    this.page.drawLine({
      start: { x: MARGIN_SIDE, y: top - 28 },
      end: { x: PAGE_WIDTH - MARGIN_SIDE, y: top - 28 },
      thickness: 1,
      color: GREEN,
    });
    this.y = top - 28 - 14;
  }

  private write(text: string, x: number, y: number, size: number, font: PDFFont, color: RGB): void {
    this.page.drawText(this.clean(text, font), { x, y, size, font, color });
  }

  private width(text: string, size: number, font: PDFFont): number {
    return font.widthOfTextAtSize(this.clean(text, font), size);
  }

  /** What the standard fonts cannot encode: the real minus becomes an en dash, anything else a `?`. */
  private clean(text: string, font: PDFFont): string {
    const supported = new Set(font.getCharacterSet());
    return [...text.replace(/−/g, '–')]
      .map((char) => (supported.has(char.codePointAt(0) as number) ? char : '?'))
      .join('');
  }

  /** The text cut with an ellipsis so that it fits `maxWidth`. */
  private fit(text: string, size: number, font: PDFFont, maxWidth: number): string {
    if (this.width(text, size, font) <= maxWidth) return text;
    let cut = text;
    while (cut.length > 1 && this.width(`${cut}...`, size, font) > maxWidth) {
      cut = cut.slice(0, -1);
    }
    return `${cut}...`;
  }

  private wrap(text: string, size: number, font: PDFFont, maxWidth: number): string[] {
    const lines: string[] = [];
    let line = '';
    for (const word of text.split(/\s+/).filter(Boolean)) {
      const candidate = line === '' ? word : `${line} ${word}`;
      if (line !== '' && this.width(candidate, size, font) > maxWidth) {
        lines.push(line);
        line = word;
      } else {
        line = candidate;
      }
    }
    if (line !== '') lines.push(line);
    return lines;
  }
}
