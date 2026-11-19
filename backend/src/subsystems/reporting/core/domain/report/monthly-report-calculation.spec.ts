import { JurisdictionCode } from '@subsystems/cases/core/domain/value-objects/case/jurisdiction-code';
import { aReportCase, anAct, day, orphan, resetReportCaseIds, RIOS, ZARATE } from '../../test-support/monthly-report-fakes';
import { ReportPeriod } from '../value-objects/report-period.vo';
import { MonthlyReportCalculation } from './monthly-report-calculation';
import { ReportLawyer } from './monthly-report-data';
import { ReportCase } from './report-case';

const GAGA: ReportLawyer = { id: 4, lastName: 'Gaga', firstName: 'Lady', registrationNumber: null };
const ZARATE_REF = { id: ZARATE.id, lastName: ZARATE.lastName, firstName: ZARATE.firstName };

/** Un hecho del 6/10/2018 con 120 meses: el 80 % al 30/9/2026. */
const offense = {
  legalQualificationId: 1,
  legalQualificationName: 'Robo calificado',
  prescriptionMonths: 120,
  offenseDate: day('2018-10-06'),
};

/**
 * Septiembre de 2026, cerrado (corte: 30/9). Ocho causas:
 *   c1 penal de Ríos, activa, con un hecho al 80 %
 *   c2 penal de Ríos, activa, con un hecho reiniciado el 15/8 (1 %)
 *   c3 administrativa de Zárate, activa; un acto el 1/9 con plazo al 10/9 y otro el 9/9
 *   c4 amparo de Zárate, ingresada el 5/9; un acto el 6/9 con plazo al 25/9 y sin acto siguiente
 *   c5 penal de Ríos, archivada el 15/9
 *   c6 penal HUÉRFANA, activa, con un hecho al 80 %
 *   c7 administrativa HUÉRFANA, ingresada el 10/9
 *   c8 penal archivada el 10/8 (ya cerrada al inicio del mes)
 */
function september(): ReportCase[] {
  return [
    aReportCase({ offenses: [offense] }),
    aReportCase({ offenses: [offense], interruptiveActDates: [day('2026-08-15')] }),
    aReportCase({
      jurisdiction: JurisdictionCode.ADMINISTRATIVE,
      responsibleLawyer: ZARATE_REF,
      startDate: day('2026-02-01'),
      proceduralActs: [anAct(1, '2026-09-01', { dueDate: '2026-09-10' }), anAct(2, '2026-09-09')],
      interruptiveActDates: [day('2026-09-12')],
    }),
    aReportCase({
      jurisdiction: JurisdictionCode.AMPARO,
      responsibleLawyer: ZARATE_REF,
      startDate: day('2026-09-05'),
      proceduralActs: [anAct(3, '2026-09-06', { dueDate: '2026-09-25' })],
    }),
    aReportCase({ startDate: day('2026-03-01'), proceduralActs: [anAct(4, '2026-09-15', { terminal: true })] }),
    orphan({ startDate: day('2026-02-01'), offenses: [offense] }),
    orphan({ jurisdiction: JurisdictionCode.ADMINISTRATIVE, startDate: day('2026-09-10') }),
    aReportCase({ proceduralActs: [anAct(5, '2026-08-10', { terminal: true })] }),
  ];
}

const run = (cases: ReportCase[], lawyers: ReportLawyer[] = [RIOS, ZARATE, GAGA]) =>
  MonthlyReportCalculation.run({
    period: ReportPeriod.create('2026-09'),
    cutOff: day('2026-09-30'),
    inProgress: false,
    cases,
    lawyers,
  });

describe('MonthlyReportCalculation', () => {
  beforeEach(resetReportCaseIds);

  it('period y dataAsOf', () => {
    const data = run(september());
    expect(data.period).toBe('2026-09');
    expect(data.dataAsOf).toBe('2026-09-30');
  });

  // R-8, R-9
  describe('byJurisdiction', () => {
    it('siempre los tres fueros, en el orden del contrato, con al cierre = al inicio + ingresadas − archivadas', () => {
      const rows = run(september()).byJurisdiction;
      expect(rows).toEqual([
        { jurisdiction: 'CRIMINAL', atStart: 4, admitted: 0, archived: 1, atEnd: 3, percentage: 50 },
        { jurisdiction: 'ADMINISTRATIVE', atStart: 1, admitted: 1, archived: 0, atEnd: 2, percentage: 33 },
        { jurisdiction: 'AMPARO', atStart: 0, admitted: 1, archived: 0, atEnd: 1, percentage: 17 },
      ]);
      for (const row of rows) {
        expect(row.atEnd).toBe(row.atStart + row.admitted - row.archived);
      }
    });

    it('sin causas activas los porcentajes son 0 y los tres fueros siguen', () => {
      const rows = run([]).byJurisdiction;
      expect(rows.map((r) => r.jurisdiction)).toEqual(['CRIMINAL', 'ADMINISTRATIVE', 'AMPARO']);
      expect(rows.every((r) => r.percentage === 0 && r.atEnd === 0)).toBe(true);
    });
  });

  describe('summary', () => {
    // R-12, R-13
    it('activeCases es la suma de los totales de lawyers y de unassigned (D-145)', () => {
      const data = run(september());
      const summed = data.lawyers.reduce((sum, l) => sum + l.total, 0) + data.unassigned.total;
      expect(data.summary.activeCases).toBe(6);
      expect(summed).toBe(6);
    });

    it('el promedio no cuenta las huérfanas: (6 − 2) / 3 abogados = 1,3; mínimo y máximo salen de lawyers', () => {
      const { summary } = run(september());
      expect(summary.averagePerLawyer).toBe(1.3);
      expect(summary.minPerLawyer).toBe(0);
      expect(summary.maxPerLawyer).toBe(2);
    });

    // R-14
    it('las huérfanas siguen activas: no suman a archived', () => {
      const { summary } = run(september());
      expect(summary.admitted).toBe(2);
      expect(summary.archived).toBe(1);
    });

    it('sin abogados: promedio 0 y mínimo y máximo null; las huérfanas no los cambian', () => {
      const { summary, lawyers, unassigned } = run([orphan()], []);
      expect(lawyers).toEqual([]);
      expect(unassigned.total).toBe(1);
      expect(summary).toMatchObject({ activeCases: 1, averagePerLawyer: 0, minPerLawyer: null, maxPerLawyer: null });
    });
  });

  // R-10, R-15
  describe('lawyers', () => {
    it('un renglón por abogado vigente, tenga o no causas, del más cargado al menos; empate por apellido', () => {
      const { lawyers } = run(september());
      expect(lawyers.map((l) => [l.lawyer.lastName, l.total])).toEqual([
        ['Ríos', 2],
        ['Zárate', 2],
        ['Gaga', 0],
      ]);
    });

    it('cuenta las causas por fuero y la diferencia con el promedio con un decimal', () => {
      const [rios, zarate, gaga] = run(september()).lawyers;
      expect(rios).toEqual({
        lawyer: RIOS,
        criminal: 2,
        administrative: 0,
        amparo: 0,
        total: 2,
        differenceFromAverage: 0.7,
      });
      expect(zarate).toMatchObject({ criminal: 0, administrative: 1, amparo: 1, total: 2, differenceFromAverage: 0.7 });
      expect(gaga.differenceFromAverage).toBe(-1.3);
    });

    it('un abogado que no está entre los vigentes no figura (D-145): sus causas no se cuentan en lawyers', () => {
      const { lawyers } = run(september(), [RIOS]);
      expect(lawyers.map((l) => l.lawyer.id)).toEqual([RIOS.id]);
    });
  });

  // R-11
  describe('unassigned (D-145)', () => {
    it('cuenta las causas activas sin responsable por fuero, solo el número', () => {
      expect(run(september()).unassigned).toEqual({ criminal: 1, administrative: 1, amparo: 0, total: 2 });
    });

    // Decidido con el equipo: una causa de un abogado que ya no está vigente no tiene fila que la lleve.
    it('una causa de un abogado que ya no está vigente cuenta como sin asignar, y la suma sigue cerrando', () => {
      // Zárate (c3 y c4) no está entre los abogados vigentes: sus dos causas activas pasan a "sin asignar".
      const data = run(september(), [RIOS]);

      expect(data.unassigned).toEqual({ criminal: 1, administrative: 2, amparo: 1, total: 4 });
      const summed = data.lawyers.reduce((sum, l) => sum + l.total, 0) + data.unassigned.total;
      expect(summed).toBe(data.summary.activeCases);
    });

    it('esas causas tampoco entran en el promedio, el mínimo ni el máximo, ni se nombran en las alertas', () => {
      const data = run(september(), [RIOS]);

      expect(data.summary.averagePerLawyer).toBe(2);
      expect(data.summary.minPerLawyer).toBe(2);
      expect(data.summary.maxPerLawyer).toBe(2);
      expect(data.prescription.alerts.every((alert) => alert.responsibleLawyer === null || alert.responsibleLawyer.id === RIOS.id)).toBe(true);
    });

    it('siempre viene, con ceros si no hay huérfanas', () => {
      expect(run([aReportCase()]).unassigned).toEqual({ criminal: 0, administrative: 0, amparo: 0, total: 0 });
    });
  });

  // R-16, R-17
  describe('prescription', () => {
    it('cuenta las penales activas con prescripción, en los cuatro tramos y en orden', () => {
      const { prescription } = run(september());
      expect(prescription.cases).toBe(3);
      expect(prescription.bands).toEqual([
        { band: 'UNDER_50', cases: 1, percentage: 33 },
        { band: 'FROM_50_TO_70', cases: 0, percentage: 0 },
        { band: 'FROM_70_TO_90', cases: 2, percentage: 67 },
        { band: 'FROM_90', cases: 0, percentage: 0 },
      ]);
    });

    it('las alertas son las de 70 % o más; la huérfana figura con responsibleLawyer null (D-145)', () => {
      const { alerts } = run(september()).prescription;
      expect(alerts).toEqual([
        {
          caseId: 1,
          sacNumber: '10000001',
          caption: 'Causa 1',
          responsibleLawyer: { id: RIOS.id, lastName: 'Ríos', firstName: 'Malena' },
          legalQualificationName: 'Robo calificado',
          elapsedPercentage: 80,
          expired: false,
        },
        {
          caseId: 6,
          sacNumber: '10000006',
          caption: 'Causa 6',
          responsibleLawyer: null,
          legalQualificationName: 'Robo calificado',
          elapsedPercentage: 80,
          expired: false,
        },
      ]);
    });

    it('un plazo cumplido va al último tramo y encabeza la lista de alertas', () => {
      const expired = aReportCase({ offenses: [{ ...offense, offenseDate: day('2010-01-01'), prescriptionMonths: 12 }] });
      const { prescription } = run([aReportCase({ offenses: [offense] }), expired]);
      expect(prescription.bands.find((b) => b.band === 'FROM_90')?.cases).toBe(1);
      expect(prescription.alerts.map((a) => [a.caseId, a.expired])).toEqual([
        [1, true],
        [2, false],
      ]);
    });
  });

  // R-18
  describe('deadlines', () => {
    it('clasifica por el acto siguiente y cuenta los actos interruptivos del mes aparte', () => {
      expect(run(september()).deadlines).toEqual({
        total: 2,
        metOnTime: 1,
        metOnLastDay: 0,
        overdue: 1,
        pending: 0,
        interruptiveActs: 1,
      });
    });

    it('total es la suma de los cuatro', () => {
      const d = run(september()).deadlines;
      expect(d.total).toBe(d.metOnTime + d.metOnLastDay + d.overdue + d.pending);
    });
  });

  it('el mes en curso se calcula a hoy: lo que vence hoy sigue pendiente', () => {
    const data = MonthlyReportCalculation.run({
      period: ReportPeriod.create('2026-10'),
      cutOff: day('2026-10-06'),
      inProgress: true,
      cases: [aReportCase({ proceduralActs: [anAct(1, '2026-10-01', { dueDate: '2026-10-06' })] })],
      lawyers: [RIOS],
    });
    expect(data.dataAsOf).toBe('2026-10-06');
    expect(data.deadlines).toMatchObject({ total: 1, pending: 1, overdue: 0 });
  });
});
