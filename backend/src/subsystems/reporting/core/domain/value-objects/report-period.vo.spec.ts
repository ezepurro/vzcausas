import { InvalidReportPeriodError } from '../errors/reporting.errors';
import { ReportPeriod } from './report-period.vo';

describe('ReportPeriod', () => {
  // R-1
  describe('create', () => {
    it.each(['2026-13', '2026-00', '2026-8', 'agosto', '', '2026-08-01', ' 2026-08'])(
      'rechaza "%s" con INVALID_REQUEST y details.period',
      (raw) => {
        expect(() => ReportPeriod.create(raw)).toThrow(InvalidReportPeriodError);
        try {
          ReportPeriod.create(raw);
        } catch (error) {
          const e = error as InvalidReportPeriodError;
          expect(e.code).toBe('INVALID_REQUEST');
          expect(e.message).toBe('Parámetros de query inválidos.');
          expect(e.details).toEqual({ period: 'Debe tener el formato AAAA-MM.' });
        }
      },
    );

    it('rechaza lo que no es un texto', () => {
      expect(() => ReportPeriod.create(undefined)).toThrow(InvalidReportPeriodError);
      expect(() => ReportPeriod.create(202608)).toThrow(InvalidReportPeriodError);
    });

    it('acepta AAAA-MM y devuelve el mismo texto', () => {
      expect(ReportPeriod.create('2026-08').value).toBe('2026-08');
    });
  });

  it('parse devuelve null en vez de lanzar', () => {
    expect(ReportPeriod.parse('2026-13')).toBeNull();
    expect(ReportPeriod.parse('2026-12')?.value).toBe('2026-12');
  });

  it('containing: el mes al que pertenece una fecha civil', () => {
    expect(ReportPeriod.containing(new Date('2026-10-06T00:00:00.000Z')).value).toBe('2026-10');
  });

  it('firstDay y lastDay, también en febrero de un año bisiesto', () => {
    expect(ReportPeriod.create('2026-08').firstDay().toISOString()).toBe('2026-08-01T00:00:00.000Z');
    expect(ReportPeriod.create('2026-08').lastDay().toISOString()).toBe('2026-08-31T00:00:00.000Z');
    expect(ReportPeriod.create('2026-02').lastDay().toISOString()).toBe('2026-02-28T00:00:00.000Z');
    expect(ReportPeriod.create('2028-02').lastDay().toISOString()).toBe('2028-02-29T00:00:00.000Z');
  });

  it('previous y next cruzan el cambio de año', () => {
    expect(ReportPeriod.create('2026-01').previous().value).toBe('2025-12');
    expect(ReportPeriod.create('2026-12').next().value).toBe('2027-01');
  });

  it('contains: incluye el primer y el último día del mes y ninguno de los vecinos', () => {
    const august = ReportPeriod.create('2026-08');
    expect(august.contains(new Date('2026-08-01T00:00:00.000Z'))).toBe(true);
    expect(august.contains(new Date('2026-08-31T00:00:00.000Z'))).toBe(true);
    expect(august.contains(new Date('2026-07-31T00:00:00.000Z'))).toBe(false);
    expect(august.contains(new Date('2026-09-01T00:00:00.000Z'))).toBe(false);
  });

  it('fromJanuary: de enero del año al período, en orden', () => {
    expect(ReportPeriod.create('2026-03').fromJanuary().map((p) => p.value)).toEqual(['2026-01', '2026-02', '2026-03']);
    expect(ReportPeriod.create('2026-01').fromJanuary().map((p) => p.value)).toEqual(['2026-01']);
  });

  it('through: vacío si el último es anterior al primero', () => {
    expect(ReportPeriod.create('2026-03').through(ReportPeriod.create('2026-02'))).toEqual([]);
    expect(ReportPeriod.create('2025-12').through(ReportPeriod.create('2026-01')).map((p) => p.value)).toEqual([
      '2025-12',
      '2026-01',
    ]);
  });
});
