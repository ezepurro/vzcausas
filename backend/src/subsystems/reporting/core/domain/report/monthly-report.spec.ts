import { day } from '../../test-support/monthly-report-fakes';
import { ReportCalendar } from '../value-objects/report-calendar.vo';
import { ReportPeriod } from '../value-objects/report-period.vo';
import { MonthlyReportCalculation } from './monthly-report-calculation';
import { MonthlyReportData } from './monthly-report-data';
import { MonthlyReport } from './monthly-report';

const period = (value: string) => ReportPeriod.create(value);
const TODAY = day('2026-10-06');
const calendar = ReportCalendar.of(period('2026-08'), TODAY);

/** Los datos de un mes con las cifras que importan para armar el reporte. */
function dataOf(value: string, figures: { admitted: number; archived: number; activeCases: number }): MonthlyReportData {
  const base = MonthlyReportCalculation.run({
    period: period(value),
    cutOff: period(value).lastDay(),
    inProgress: false,
    cases: [],
    lawyers: [],
  });
  return { ...base, summary: { ...base.summary, ...figures } };
}

const AUGUST = dataOf('2026-08', { admitted: 8, archived: 9, activeCases: 94 });
const SEPTEMBER = dataOf('2026-09', { admitted: 15, archived: 10, activeCases: 99 });

describe('MonthlyReport', () => {
  describe('snapshotsNeededFor', () => {
    it('un mes cerrado: las fotos de availableFrom a él (incluida la suya)', () => {
      expect(MonthlyReport.snapshotsNeededFor(calendar, period('2026-09')).map((p) => p.value)).toEqual([
        '2026-08',
        '2026-09',
      ]);
    });

    it('el mes en curso: las fotos de los meses cerrados, no la suya', () => {
      expect(MonthlyReport.snapshotsNeededFor(calendar, period('2026-10')).map((p) => p.value)).toEqual([
        '2026-08',
        '2026-09',
      ]);
    });

    it('el primer mes con reporte: solo la suya, sin mes anterior', () => {
      expect(MonthlyReport.snapshotsNeededFor(calendar, period('2026-08')).map((p) => p.value)).toEqual(['2026-08']);
    });

    it('enero pide diciembre del año anterior para el cambio, si tiene reporte', () => {
      const long = ReportCalendar.of(period('2025-11'), TODAY);
      expect(MonthlyReport.snapshotsNeededFor(long, period('2026-01')).map((p) => p.value)).toEqual([
        '2025-12',
        '2026-01',
      ]);
    });
  });

  // R-23
  describe('assemble', () => {
    const snapshots = new Map([
      ['2026-08', AUGUST],
      ['2026-09', SEPTEMBER],
    ]);

    it('monthly va de enero al período; los meses anteriores a availableFrom traen todo en null', () => {
      const report = MonthlyReport.assemble(calendar, period('2026-09'), SEPTEMBER, snapshots);
      expect(report.monthly.map((m) => m.period)).toEqual([
        '2026-01',
        '2026-02',
        '2026-03',
        '2026-04',
        '2026-05',
        '2026-06',
        '2026-07',
        '2026-08',
        '2026-09',
      ]);
      expect(report.monthly[0]).toEqual({ period: '2026-01', admitted: null, archived: null, balance: null, activeAtEnd: null });
      expect(report.monthly[6]).toEqual({ period: '2026-07', admitted: null, archived: null, balance: null, activeAtEnd: null });
    });

    it('cada mes sale de su propia foto, con saldo y activas al cierre', () => {
      const report = MonthlyReport.assemble(calendar, period('2026-09'), SEPTEMBER, snapshots);
      expect(report.monthly[7]).toEqual({ period: '2026-08', admitted: 8, archived: 9, balance: -1, activeAtEnd: 94 });
      expect(report.monthly[8]).toEqual({ period: '2026-09', admitted: 15, archived: 10, balance: 5, activeAtEnd: 99 });
    });

    it('los cambios comparan con el mes anterior', () => {
      const report = MonthlyReport.assemble(calendar, period('2026-09'), SEPTEMBER, snapshots);
      expect(report.admittedChange).toBe(7);
      expect(report.archivedChange).toBe(1);
    });

    it('los cambios son null si el mes anterior no tiene reporte', () => {
      const report = MonthlyReport.assemble(calendar, period('2026-08'), AUGUST, snapshots);
      expect(report.admittedChange).toBeNull();
      expect(report.archivedChange).toBeNull();
    });

    it('el mes en curso: IN_PROGRESS, sus datos son el cálculo del día y compara con la foto de septiembre', () => {
      const live = dataOf('2026-10', { admitted: 3, archived: 4, activeCases: 98 });
      const report = MonthlyReport.assemble(calendar, period('2026-10'), live, snapshots);
      expect(report.status).toBe('IN_PROGRESS');
      expect(report.admittedChange).toBe(-12);
      expect(report.monthly[9]).toMatchObject({ period: '2026-10', admitted: 3, activeAtEnd: 98 });
    });

    it('un mes cerrado: CLOSED, con availableFrom y currentPeriod de la configuración', () => {
      const report = MonthlyReport.assemble(calendar, period('2026-09'), SEPTEMBER, snapshots);
      expect(report.status).toBe('CLOSED');
      expect(report.availableFrom).toBe('2026-08');
      expect(report.currentPeriod).toBe('2026-10');
    });
  });
});
