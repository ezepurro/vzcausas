import { PDFDocument } from '@cantoo/pdf-lib';
import { ConfigService } from '@nestjs/config';
import { MonthlyReport } from '../../core/domain/report/monthly-report';
import { MonthlyReportData, ReportLawyerLoad } from '../../core/domain/report/monthly-report-data';
import { ReportCalendar } from '../../core/domain/value-objects/report-calendar.vo';
import { ReportPeriod } from '../../core/domain/value-objects/report-period.vo';
import { PdfLibMonthlyReportRenderer } from './pdf-lib-monthly-report.renderer';

const config = { getOrThrow: () => 'America/Argentina/Cordoba' } as unknown as ConfigService;
const ISSUE = { by: 'Vázquez, Fernando G.', at: new Date('2026-11-13T13:42:00.000Z') };

const load = (id: number, lastName: string, total: number, difference: number): ReportLawyerLoad => ({
  lawyer: { id, lastName, firstName: 'Nombre', registrationNumber: id % 2 ? '1-36842' : null },
  criminal: total,
  administrative: 0,
  amparo: 0,
  total,
  differenceFromAverage: difference,
});

function data(overrides: Partial<MonthlyReportData> = {}): MonthlyReportData {
  return {
    period: '2026-08',
    dataAsOf: '2026-08-31',
    summary: { activeCases: 99, admitted: 15, archived: 10, averagePerLawyer: 14.1, minPerLawyer: 13, maxPerLawyer: 17 },
    byJurisdiction: [
      { jurisdiction: 'CRIMINAL', atStart: 56, admitted: 8, archived: 6, atEnd: 58, percentage: 59 },
      { jurisdiction: 'ADMINISTRATIVE', atStart: 28, admitted: 5, archived: 3, atEnd: 30, percentage: 30 },
      { jurisdiction: 'AMPARO', atStart: 10, admitted: 2, archived: 1, atEnd: 11, percentage: 11 },
    ],
    lawyers: [load(3, 'Ríos', 17, 2.9), load(2, 'Zárate', 13, -1.1)],
    unassigned: { criminal: 2, administrative: 1, amparo: 0, total: 3 },
    prescription: {
      cases: 58,
      bands: [
        { band: 'UNDER_50', cases: 37, percentage: 64 },
        { band: 'FROM_50_TO_70', cases: 14, percentage: 24 },
        { band: 'FROM_70_TO_90', cases: 5, percentage: 9 },
        { band: 'FROM_90', cases: 2, percentage: 3 },
      ],
      alerts: [
        {
          caseId: 21,
          sacNumber: '11873402',
          caption: 'LUNA, Javier p.s.a. Lesiones leves',
          responsibleLawyer: null,
          legalQualificationName: 'Lesiones leves',
          elapsedPercentage: 94,
          expired: false,
        },
      ],
    },
    deadlines: { total: 41, metOnTime: 39, metOnLastDay: 2, overdue: 0, pending: 0, interruptiveActs: 3 },
    ...overrides,
  };
}

const calendar = ReportCalendar.of(ReportPeriod.create('2026-01'), new Date('2026-09-13T00:00:00.000Z'));
const report = (d: MonthlyReportData, period = '2026-08') =>
  MonthlyReport.assemble(calendar, ReportPeriod.create(period), d, new Map());

describe('PdfLibMonthlyReportRenderer', () => {
  const renderer = new PdfLibMonthlyReportRenderer(config);

  const render = async (r: MonthlyReport) => {
    const bytes = await renderer.render(r, ISSUE);
    return { bytes, pdf: await PDFDocument.load(bytes) };
  };

  // R-26
  it('genera un PDF A4 válido, con el mes cerrado y una huérfana en las alertas y en el cuadro de abogados', async () => {
    const { bytes, pdf } = await render(report(data()));
    expect(Buffer.from(bytes).subarray(0, 5).toString()).toBe('%PDF-');
    expect(pdf.getPageCount()).toBeGreaterThanOrEqual(1);
    const { width, height } = pdf.getPage(0).getSize();
    expect(width).toBeCloseTo(595.28, 1);
    expect(height).toBeCloseTo(841.89, 1);
  });

  it('el mes en curso con la leyenda "Mes en curso" se genera', async () => {
    const live = data({ period: '2026-09', dataAsOf: '2026-09-13' });
    const { pdf } = await render(report(live, '2026-09'));
    expect(pdf.getPageCount()).toBeGreaterThanOrEqual(1);
  });

  it('sin datos (sin abogados, causas ni alertas) se genera igual', async () => {
    const empty = data({
      summary: { activeCases: 0, admitted: 0, archived: 0, averagePerLawyer: 0, minPerLawyer: null, maxPerLawyer: null },
      byJurisdiction: data().byJurisdiction.map((row) => ({ ...row, atStart: 0, admitted: 0, archived: 0, atEnd: 0, percentage: 0 })),
      lawyers: [],
      unassigned: { criminal: 0, administrative: 0, amparo: 0, total: 0 },
      prescription: { cases: 0, bands: [], alerts: [] },
      deadlines: { total: 0, metOnTime: 0, metOnLastDay: 0, overdue: 0, pending: 0, interruptiveActs: 0 },
    });
    const { pdf } = await render(report(empty));
    expect(pdf.getPageCount()).toBeGreaterThanOrEqual(1);
  });

  it('con muchos abogados y alertas pasa a otra página y numera todas', async () => {
    const many = data({
      lawyers: Array.from({ length: 60 }, (_, i) => load(i + 1, `Apellido${i}`, 10, 0)),
      prescription: {
        ...data().prescription,
        alerts: Array.from({ length: 40 }, (_, i) => ({
          caseId: i + 1,
          sacNumber: null,
          caption: 'Una carátula bastante larga '.repeat(8),
          responsibleLawyer: { id: 1, lastName: 'Ríos', firstName: 'Malena' },
          legalQualificationName: 'Q',
          elapsedPercentage: 75,
          expired: i % 2 === 0,
        })),
      },
    });
    const { pdf } = await render(report(many));
    expect(pdf.getPageCount()).toBeGreaterThan(2);
  });

  it('el signo menos de un saldo negativo y los caracteres fuera del alfabeto estándar no rompen el PDF', async () => {
    const odd = data({
      lawyers: [{ ...load(3, 'Ríos', 17, -2.9), lawyer: { id: 3, lastName: 'Ñandú ☃', firstName: 'Zoë', registrationNumber: null } }],
      summary: { activeCases: 5, admitted: 1, archived: 9, averagePerLawyer: 14.1, minPerLawyer: 13, maxPerLawyer: 17 },
    });
    await expect(render(report(odd))).resolves.toBeDefined();
  });
});
