import { JurisdictionCode } from '@subsystems/cases/core/domain/value-objects/case/jurisdiction-code';
import { aReportCase, anAct, day, resetReportCaseIds } from '../../test-support/monthly-report-fakes';
import { ReportPeriod } from '../value-objects/report-period.vo';

const period = (value: string) => ReportPeriod.create(value);

/** Un hecho del 6/10/2018 con una calificación de 120 meses: prescribe el 6/10/2028 (3653 días de plazo). */
const offense = (declaredOn: string | null = null) => ({
  legalQualificationId: 1,
  legalQualificationName: 'Robo calificado',
  prescriptionMonths: 120,
  offenseDate: day('2018-10-06'),
  prescriptionDeclaredOn: declaredOn === null ? null : day(declaredOn),
});

describe('ReportCase', () => {
  beforeEach(resetReportCaseIds);

  // R-6
  describe('isActiveAt', () => {
    it('no existe antes de su startDate y existe desde ese día', () => {
      const c = aReportCase({ startDate: day('2026-01-10') });
      expect(c.isActiveAt(day('2026-01-09'))).toBe(false);
      expect(c.isActiveAt(day('2026-01-10'))).toBe(true);
    });

    it('el estado a una fecha es el del acto vigente más reciente con actDate hasta esa fecha (D-14)', () => {
      const c = aReportCase({
        proceduralActs: [anAct(1, '2026-02-01'), anAct(2, '2026-03-15', { terminal: true })],
      });
      expect(c.isActiveAt(day('2026-03-14'))).toBe(true);
      expect(c.isActiveAt(day('2026-03-15'))).toBe(false);
    });

    it('un acto posterior a la fecha no cuenta: la causa archivada después estaba activa antes', () => {
      const c = aReportCase({ proceduralActs: [anAct(1, '2026-09-10', { terminal: true })] });
      expect(c.isActiveAt(day('2026-08-31'))).toBe(true);
    });

    it('con dos actos el mismo día manda el de mayor id', () => {
      const c = aReportCase({
        proceduralActs: [anAct(5, '2026-03-15', { terminal: true }), anAct(6, '2026-03-15')],
      });
      expect(c.isActiveAt(day('2026-03-31'))).toBe(true);
    });

    it('un acto reabre la causa si es posterior al que la archivó (D-99)', () => {
      const c = aReportCase({
        proceduralActs: [anAct(1, '2026-03-15', { terminal: true }), anAct(2, '2026-04-20')],
      });
      expect(c.isActiveAt(day('2026-04-01'))).toBe(false);
      expect(c.isActiveAt(day('2026-04-20'))).toBe(true);
    });

    it('"Prescripta" es terminal desde la fecha de su declaración', () => {
      const c = aReportCase({ prescribedOn: day('2026-05-01') });
      expect(c.isActiveAt(day('2026-04-30'))).toBe(true);
      expect(c.isActiveAt(day('2026-05-01'))).toBe(false);
    });
  });

  // R-5
  describe('wasAdmittedIn', () => {
    const c = aReportCase({ startDate: day('2026-08-01') });

    it('su startDate cae dentro del mes, el primer día incluido', () => {
      expect(c.wasAdmittedIn(period('2026-08'), day('2026-08-31'))).toBe(true);
      expect(aReportCase({ startDate: day('2026-08-31') }).wasAdmittedIn(period('2026-08'), day('2026-08-31'))).toBe(true);
    });

    it('no ingresó en el mes anterior ni en el siguiente', () => {
      expect(c.wasAdmittedIn(period('2026-07'), day('2026-07-31'))).toBe(false);
      expect(c.wasAdmittedIn(period('2026-09'), day('2026-09-30'))).toBe(false);
    });

    it('en el mes en curso no cuenta lo que empieza después de hoy', () => {
      expect(aReportCase({ startDate: day('2026-10-20') }).wasAdmittedIn(period('2026-10'), day('2026-10-06'))).toBe(false);
    });
  });

  // R-7
  describe('wasArchivedIn', () => {
    it('pasó a un estado terminal dentro del mes, en la fecha del acto', () => {
      const c = aReportCase({ proceduralActs: [anAct(1, '2026-03-15', { terminal: true })] });
      expect(c.wasArchivedIn(period('2026-03'), day('2026-03-31'))).toBe(true);
    });

    it('no se archiva dos veces: ni el mes anterior a su archivo ni el siguiente', () => {
      const c = aReportCase({ proceduralActs: [anAct(1, '2026-03-15', { terminal: true })] });
      expect(c.wasArchivedIn(period('2026-02'), day('2026-02-28'))).toBe(false);
      expect(c.wasArchivedIn(period('2026-04'), day('2026-04-30'))).toBe(false);
    });

    it('"Prescripta" cuenta en el mes de la declaración', () => {
      const c = aReportCase({ prescribedOn: day('2026-05-12') });
      expect(c.wasArchivedIn(period('2026-05'), day('2026-05-31'))).toBe(true);
    });

    it('ingresada y archivada en el mismo mes cuenta como archivada', () => {
      const c = aReportCase({
        startDate: day('2026-06-02'),
        proceduralActs: [anAct(1, '2026-06-20', { terminal: true })],
      });
      expect(c.wasArchivedIn(period('2026-06'), day('2026-06-30'))).toBe(true);
    });

    // D-145
    it('una causa que sigue activa (por ejemplo, una huérfana) no está archivada', () => {
      expect(aReportCase({ responsibleLawyer: null }).wasArchivedIn(period('2026-03'), day('2026-03-31'))).toBe(false);
    });
  });

  // R-16
  describe('prescriptionAt', () => {
    const CUT_OFF = day('2026-09-30');

    it('un hecho del 6/10/2018 con 120 meses lleva el 80 % al 30/9/2026 y es alerta', () => {
      const summary = aReportCase({ offenses: [offense()] }).prescriptionAt(CUT_OFF);
      expect(summary?.elapsedPercentage).toBe(80);
      expect(summary?.alert).toBe(true);
      expect(summary?.expired).toBe(false);
    });

    it('un acto interruptivo hasta la fecha de corte reinicia el plazo; uno posterior no', () => {
      const before = aReportCase({ offenses: [offense()], interruptiveActDates: [day('2026-08-15')] });
      const after = aReportCase({ offenses: [offense()], interruptiveActDates: [day('2026-10-02')] });
      expect(before.prescriptionAt(CUT_OFF)?.elapsedPercentage).toBe(1);
      expect(after.prescriptionAt(CUT_OFF)?.elapsedPercentage).toBe(80);
    });

    it('una declaración posterior a la fecha de corte todavía no existía', () => {
      const c = aReportCase({ offenses: [offense('2026-10-01')] });
      expect(c.prescriptionAt(CUT_OFF)?.elapsedPercentage).toBe(80);
    });

    it('con todas las calificaciones declaradas hasta la fecha, no tiene prescripción (D-113)', () => {
      expect(aReportCase({ offenses: [offense('2026-09-01')] }).prescriptionAt(CUT_OFF)).toBeNull();
    });

    it('sin calificaciones no tiene prescripción (D-74)', () => {
      expect(aReportCase().prescriptionAt(CUT_OFF)).toBeNull();
    });

    it('solo prescribe el fuero penal', () => {
      const amparo = aReportCase({ jurisdiction: JurisdictionCode.AMPARO, offenses: [offense()] });
      expect(amparo.prescriptionAt(CUT_OFF)).toBeNull();
    });
  });

  // R-18
  describe('deadlineOutcomesIn', () => {
    const SEPTEMBER = period('2026-09');
    const closed = (c: ReturnType<typeof aReportCase>) => c.deadlineOutcomesIn(SEPTEMBER, day('2026-09-30'), false);

    it('el acto siguiente antes del vencimiento: cumplido dentro del término', () => {
      const c = aReportCase({
        proceduralActs: [anAct(1, '2026-09-01', { dueDate: '2026-09-10' }), anAct(2, '2026-09-09')],
      });
      expect(closed(c)).toEqual(['MET_ON_TIME']);
    });

    it('el acto siguiente el día del vencimiento: cumplido el último día', () => {
      const c = aReportCase({
        proceduralActs: [anAct(1, '2026-09-01', { dueDate: '2026-09-10' }), anAct(2, '2026-09-10')],
      });
      expect(closed(c)).toEqual(['MET_ON_LAST_DAY']);
    });

    it('sin acto siguiente, o con uno posterior al vencimiento: venció sin acto registrado', () => {
      const none = aReportCase({ proceduralActs: [anAct(1, '2026-09-01', { dueDate: '2026-09-10' })] });
      const late = aReportCase({
        proceduralActs: [anAct(1, '2026-09-01', { dueDate: '2026-09-10' }), anAct(2, '2026-09-12')],
      });
      expect(closed(none)).toEqual(['OVERDUE']);
      expect(closed(late)).toEqual(['OVERDUE']);
    });

    it('en un mes cerrado nada queda pendiente: ni el que vence el último día del mes', () => {
      const c = aReportCase({ proceduralActs: [anAct(1, '2026-09-20', { dueDate: '2026-09-30' })] });
      expect(closed(c)).toEqual(['OVERDUE']);
    });

    it('un acto que no abre plazo, o cuyo vencimiento cae en otro mes, no cuenta', () => {
      const c = aReportCase({
        proceduralActs: [anAct(1, '2026-09-01'), anAct(2, '2026-09-02', { dueDate: '2026-10-02' })],
      });
      expect(closed(c)).toEqual([]);
    });

    it('en el mes en curso, el acto siguiente cierra el plazo y el último vence más adelante: sigue en curso', () => {
      const october = period('2026-10');
      const today = day('2026-10-06');
      const c = aReportCase({
        proceduralActs: [
          anAct(1, '2026-09-30', { dueDate: '2026-10-05' }),
          anAct(2, '2026-10-01', { dueDate: '2026-10-06' }),
          anAct(3, '2026-10-02', { dueDate: '2026-10-20' }),
        ],
      });
      // El acto 1 lo cierra el 2 (1/10 < 5/10); el acto 2 lo cierra el 3 (2/10 < 6/10); el 3 no tiene siguiente.
      expect(c.deadlineOutcomesIn(october, today, true)).toEqual(['MET_ON_TIME', 'MET_ON_TIME', 'PENDING']);
    });

    it('en el mes en curso, sin acto siguiente: hoy es pendiente y ayer es vencido', () => {
      const october = period('2026-10');
      const today = day('2026-10-06');
      const dueToday = aReportCase({ proceduralActs: [anAct(1, '2026-10-01', { dueDate: '2026-10-06' })] });
      const dueYesterday = aReportCase({ proceduralActs: [anAct(1, '2026-10-01', { dueDate: '2026-10-05' })] });
      expect(dueToday.deadlineOutcomesIn(october, today, true)).toEqual(['PENDING']);
      expect(dueYesterday.deadlineOutcomesIn(october, today, true)).toEqual(['OVERDUE']);
    });
  });

  describe('interruptiveActsIn', () => {
    it('cuenta los actos interruptivos con actDate dentro del mes y hasta el corte', () => {
      const c = aReportCase({ interruptiveActDates: [day('2026-08-31'), day('2026-09-01'), day('2026-09-30'), day('2026-10-01')] });
      expect(c.interruptiveActsIn(period('2026-09'), day('2026-09-30'))).toBe(2);
    });
  });
});
