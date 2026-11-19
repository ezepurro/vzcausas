import { MonthlyReportNotFoundError } from '../errors/reporting.errors';
import { ReportCalendar } from './report-calendar.vo';
import { ReportPeriod } from './report-period.vo';

const period = (value: string) => ReportPeriod.create(value);
const TODAY = new Date('2026-10-06T00:00:00.000Z');

describe('ReportCalendar', () => {
  const calendar = ReportCalendar.of(period('2026-08'), TODAY);

  it('el mes en curso sale de la fecha de hoy', () => {
    expect(calendar.currentPeriod.value).toBe('2026-10');
  });

  // R-2
  describe('defaultPeriod', () => {
    it('es el último mes cerrado', () => {
      expect(calendar.defaultPeriod().value).toBe('2026-09');
    });

    it('es el mes en curso si todavía no hay ninguno cerrado', () => {
      expect(ReportCalendar.of(period('2026-10'), TODAY).defaultPeriod().value).toBe('2026-10');
    });

    it('sin availableFrom configurada solo hay reporte del mes en curso', () => {
      const unconfigured = ReportCalendar.of(null, TODAY);
      expect(unconfigured.defaultPeriod().value).toBe('2026-10');
      expect(unconfigured.closedPeriods()).toEqual([]);
    });

    it('una availableFrom futura se toma como el mes en curso', () => {
      expect(ReportCalendar.of(period('2027-01'), TODAY).availableFrom.value).toBe('2026-10');
    });
  });

  // R-3
  describe('resolve', () => {
    it('devuelve el período pedido si tiene reporte, incluido el primero y el mes en curso', () => {
      expect(calendar.resolve(period('2026-08')).value).toBe('2026-08');
      expect(calendar.resolve(period('2026-10')).value).toBe('2026-10');
    });

    it.each(['2026-07', '2025-12', '2026-11'])('%s: 404 MONTHLY_REPORT_NOT_FOUND textual', (value) => {
      expect(() => calendar.resolve(period(value))).toThrow(MonthlyReportNotFoundError);
      try {
        calendar.resolve(period(value));
      } catch (error) {
        const e = error as MonthlyReportNotFoundError;
        expect(e.code).toBe('MONTHLY_REPORT_NOT_FOUND');
        expect(e.message).toBe('No hay reporte para ese período.');
        expect(e.details).toBeNull();
      }
    });

    it('sin período pedido devuelve el por defecto', () => {
      expect(calendar.resolve(undefined).value).toBe('2026-09');
    });
  });

  it('closedPeriods: de availableFrom al mes anterior al actual', () => {
    expect(calendar.closedPeriods().map((p) => p.value)).toEqual(['2026-08', '2026-09']);
  });

  it('dataAsOf: último día del mes si está cerrado, hoy si está en curso', () => {
    expect(calendar.dataAsOf(period('2026-09')).toISOString()).toBe('2026-09-30T00:00:00.000Z');
    expect(calendar.dataAsOf(period('2026-10')).toISOString()).toBe('2026-10-06T00:00:00.000Z');
  });
});
