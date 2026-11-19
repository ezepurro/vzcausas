import { day } from '../../test-support/monthly-report-fakes';
import { ReportCalendar } from '../value-objects/report-calendar.vo';
import { ReportPeriod } from '../value-objects/report-period.vo';
import { MonthlyReport } from './monthly-report';
import { MonthlyReportData, ReportLawyerLoad } from './monthly-report-data';
import { MonthlyReportNarrative } from './monthly-report-narrative';

const MINUS = '−';

const load = (id: number, lastName: string, firstName: string, total: number): ReportLawyerLoad => ({
  lawyer: { id, lastName, firstName, registrationNumber: null },
  criminal: total,
  administrative: 0,
  amparo: 0,
  total,
  differenceFromAverage: 0,
});

/** El ejemplo del contrato (agosto de 2026), con los siete abogados del prototipo. */
function augustData(overrides: Partial<MonthlyReportData> = {}): MonthlyReportData {
  return {
    period: '2026-08',
    dataAsOf: '2026-08-31',
    summary: { activeCases: 99, admitted: 15, archived: 10, averagePerLawyer: 14.1, minPerLawyer: 13, maxPerLawyer: 17 },
    byJurisdiction: [
      { jurisdiction: 'CRIMINAL', atStart: 56, admitted: 8, archived: 6, atEnd: 58, percentage: 59 },
      { jurisdiction: 'ADMINISTRATIVE', atStart: 28, admitted: 5, archived: 3, atEnd: 30, percentage: 30 },
      { jurisdiction: 'AMPARO', atStart: 10, admitted: 2, archived: 1, atEnd: 11, percentage: 11 },
    ],
    lawyers: [
      load(3, 'Ríos', 'Malena', 17),
      load(5, 'Bustos', 'Carolina', 14),
      load(7, 'Ortega', 'Lucía', 13),
      load(2, 'Zárate', 'Oscar', 13),
    ],
    unassigned: { criminal: 0, administrative: 0, amparo: 0, total: 0 },
    prescription: {
      cases: 58,
      bands: [],
      alerts: Array.from({ length: 7 }, (_, i) => ({
        caseId: i + 1,
        sacNumber: null,
        caption: 'X',
        responsibleLawyer: null,
        legalQualificationName: 'Q',
        elapsedPercentage: 80,
        expired: false,
      })),
    },
    deadlines: { total: 41, metOnTime: 39, metOnLastDay: 2, overdue: 0, pending: 0, interruptiveActs: 3 },
    ...overrides,
  };
}

const calendar = (today: string) => ReportCalendar.of(ReportPeriod.create('2026-01'), day(today));
const closedReport = (data: MonthlyReportData) =>
  MonthlyReport.assemble(calendar('2026-09-13'), ReportPeriod.create(data.period), data, new Map());

describe('MonthlyReportNarrative', () => {
  // R-26
  describe('summary', () => {
    it('los tres párrafos del contrato, con los datos del ejemplo', () => {
      expect(MonthlyReportNarrative.summary(closedReport(augustData()))).toEqual([
        'Al 31/08/2026 el estudio registra 99 causas activas: 58 en el fuero penal (59 %), 30 en el administrativo (30 %) y 11 amparos (11 %).',
        'Durante agosto ingresaron 15 causas y se archivaron 10, con un saldo de +5 respecto del cierre del mes anterior (94 activas).',
        'La carga promedio es de 14,1 causas por abogado. Ríos, Malena tiene la mayor cartera (17 causas) y Ortega, Lucía y Zárate, Oscar la menor (13). Hay 7 causas penales con más del 70 % del plazo de prescripción transcurrido.',
      ]);
    });

    it('singular: una causa, un ingreso, un archivo, un amparo', () => {
      const data = augustData({
        summary: { activeCases: 1, admitted: 1, archived: 1, averagePerLawyer: 1, minPerLawyer: 1, maxPerLawyer: 1 },
        byJurisdiction: [
          { jurisdiction: 'CRIMINAL', atStart: 0, admitted: 0, archived: 0, atEnd: 0, percentage: 0 },
          { jurisdiction: 'ADMINISTRATIVE', atStart: 0, admitted: 0, archived: 0, atEnd: 0, percentage: 0 },
          { jurisdiction: 'AMPARO', atStart: 1, admitted: 1, archived: 1, atEnd: 1, percentage: 100 },
        ],
        lawyers: [load(1, 'Ríos', 'Malena', 1)],
        prescription: { cases: 1, bands: [], alerts: [augustData().prescription.alerts[0]] },
      });
      const [first, second, third] = MonthlyReportNarrative.summary(closedReport(data));
      expect(first).toBe('Al 31/08/2026 el estudio registra 1 causa activa: 1 amparo (100 %).');
      expect(second).toBe(
        'Durante agosto ingresó 1 causa y se archivó 1, con un saldo de 0 respecto del cierre del mes anterior (1 activas).',
      );
      // Un solo abogado (o todos empatados): no se nombra mayor ni menor cartera.
      expect(third).toBe(
        'La carga promedio es de 1,0 causas por abogado. Hay 1 causa penal con más del 70 % del plazo de prescripción transcurrido.',
      );
    });

    it('sin causas activas lo dice, y sin abogados ni causas penales omite el tercer párrafo', () => {
      const data = augustData({
        summary: { activeCases: 0, admitted: 0, archived: 0, averagePerLawyer: 0, minPerLawyer: null, maxPerLawyer: null },
        lawyers: [],
        prescription: { cases: 0, bands: [], alerts: [] },
      });
      const paragraphs = MonthlyReportNarrative.summary(closedReport(data));
      expect(paragraphs).toHaveLength(2);
      expect(paragraphs[0]).toBe('Al 31/08/2026 el estudio no registra causas activas.');
    });

    it('un saldo negativo usa el signo menos', () => {
      const data = augustData({ summary: { ...augustData().summary, admitted: 3, archived: 8 } });
      expect(MonthlyReportNarrative.summary(closedReport(data))[1]).toContain(`un saldo de ${MINUS}5`);
    });
  });

  describe('deadlines', () => {
    it('el párrafo del contrato para un mes cerrado', () => {
      expect(MonthlyReportNarrative.deadlines(closedReport(augustData()))).toBe(
        'En el mes vencieron 41 plazos procesales: 39 se cumplieron con el acto correspondiente dentro del término y 2 se cumplieron el último día. No hubo plazos vencidos sin acto registrado. Se registraron 3 actos interruptivos de la prescripción.',
      );
    });

    it('nombra los vencidos sin acto, con singular y plural', () => {
      const one = augustData({ deadlines: { total: 3, metOnTime: 1, metOnLastDay: 1, overdue: 1, pending: 0, interruptiveActs: 0 } });
      expect(MonthlyReportNarrative.deadlines(closedReport(one))).toContain(
        '1 se cumplió con el acto correspondiente dentro del término y 1 se cumplió el último día. 1 venció sin acto registrado.',
      );
      const two = augustData({ deadlines: { total: 4, metOnTime: 1, metOnLastDay: 1, overdue: 2, pending: 0, interruptiveActs: 0 } });
      expect(MonthlyReportNarrative.deadlines(closedReport(two))).toContain('2 vencieron sin acto registrado.');
    });

    it('el mes en curso suma "siguen en curso"', () => {
      const data = augustData({
        period: '2026-09',
        dataAsOf: '2026-09-13',
        deadlines: { total: 2, metOnTime: 1, metOnLastDay: 0, overdue: 0, pending: 1, interruptiveActs: 1 },
      });
      const report = MonthlyReport.assemble(calendar('2026-09-13'), ReportPeriod.create('2026-09'), data, new Map());
      expect(MonthlyReportNarrative.deadlines(report)).toContain('1 siguen en curso. Se registraron 1 actos interruptivos');
    });

    it('sin plazos en el mes', () => {
      const data = augustData({ deadlines: { total: 0, metOnTime: 0, metOnLastDay: 0, overdue: 0, pending: 0, interruptiveActs: 2 } });
      expect(MonthlyReportNarrative.deadlines(closedReport(data))).toBe(
        'En el mes no venció ningún plazo procesal. Se registraron 2 actos interruptivos de la prescripción.',
      );
    });
  });

  describe('formatos', () => {
    it('períodos, fechas y números como pide el contrato', () => {
      expect(MonthlyReportNarrative.periodLabel('2026-08')).toBe('Agosto de 2026');
      expect(MonthlyReportNarrative.date('2026-08-31')).toBe('31/08/2026');
      expect(MonthlyReportNarrative.decimal(14.1)).toBe('14,1');
      expect(MonthlyReportNarrative.signed(5)).toBe('+5');
      expect(MonthlyReportNarrative.signed(-1)).toBe(`${MINUS}1`);
      expect(MonthlyReportNarrative.signed(0)).toBe('0');
      expect(MonthlyReportNarrative.signedDecimal(2.9)).toBe('+2,9');
      expect(MonthlyReportNarrative.signedDecimal(-1.1)).toBe(`${MINUS}1,1`);
      expect(MonthlyReportNarrative.signedDecimal(0)).toBe('—');
    });

    it('los abogados se nombran Apellido, Nombres; una huérfana, "Sin asignar" (D-138, D-145)', () => {
      expect(MonthlyReportNarrative.lawyerName({ lastName: 'Ríos', firstName: 'Malena' })).toBe('Ríos, Malena');
      expect(MonthlyReportNarrative.responsible(null)).toBe('Sin asignar');
      expect(MonthlyReportNarrative.responsible({ lastName: 'Ríos', firstName: 'Malena' })).toBe('Ríos, Malena');
    });
  });
});
