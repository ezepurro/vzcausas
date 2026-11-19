import { ForbiddenActionError } from '@shared/domain/domain-error';
import { AuthenticatedUser } from '@shared/domain/authenticated-user';
import { ClockPort } from '@shared/domain/clock.port';
import { MonthlyReportNotFoundError } from '../../domain/errors/reporting.errors';
import { ReportPeriod } from '../../domain/value-objects/report-period.vo';
import {
  aReportCase,
  day,
  FakeReportSource,
  FakeSnapshotRepository,
  orphan,
  resetReportCaseIds,
  RIOS,
} from '../../test-support/monthly-report-fakes';
import { MonthlyReportSnapshots } from '../services/monthly-report-snapshots.service';
import { CloseMonthlyReport } from './close-monthly-report.use-case';
import { GetMonthlyReport } from './get-monthly-report.use-case';

const admin: AuthenticatedUser = { userId: 1, roleNames: ['ADMINISTRATOR'], lawyerId: null, permissions: [] };
const lawyer: AuthenticatedUser = { userId: 2, roleNames: ['LAWYER'], lawyerId: 2, permissions: [] };
const period = (value: string) => ReportPeriod.create(value);

describe('Reporte mensual (HU43)', () => {
  let source: FakeReportSource;
  let repository: FakeSnapshotRepository;
  let today: Date;
  let get: GetMonthlyReport;
  let close: CloseMonthlyReport;

  beforeEach(() => {
    resetReportCaseIds();
    source = new FakeReportSource();
    repository = new FakeSnapshotRepository();
    today = day('2026-10-06');
    const clock: ClockPort = { now: () => new Date(`${today.toISOString().slice(0, 10)}T15:30:00.000Z`), today: () => today };
    const snapshots = new MonthlyReportSnapshots(source, repository, '2026-08', clock);
    get = new GetMonthlyReport(snapshots);
    close = new CloseMonthlyReport(snapshots);
  });

  describe('GetMonthlyReport', () => {
    // R-24
    it('solo el ADMINISTRATOR: a otro rol le responde 403 antes de leer nada', async () => {
      await expect(get.execute({ actor: lawyer })).rejects.toThrow(ForbiddenActionError);
      await expect(get.execute({ actor: lawyer })).rejects.toMatchObject({
        code: 'FORBIDDEN',
        message: 'Se requiere el rol ADMINISTRATOR para realizar esta operación.',
      });
      expect(source.loads).toBe(0);
      expect(repository.rows.size).toBe(0);
    });

    // R-3
    it('un período fuera de rango es 404 y no escribe nada', async () => {
      await expect(get.execute({ actor: admin, period: period('2026-07') })).rejects.toThrow(MonthlyReportNotFoundError);
      await expect(get.execute({ actor: admin, period: period('2026-11') })).rejects.toThrow(MonthlyReportNotFoundError);
      expect(source.loads).toBe(0);
      expect(repository.rows.size).toBe(0);
    });

    it('sin período, el último mes cerrado', async () => {
      const report = await get.execute({ actor: admin });
      expect(report.data.period).toBe('2026-09');
      expect(report.status).toBe('CLOSED');
    });

    // R-19
    it('un mes cerrado sin foto: se calcula a su último día y se guarda una fila', async () => {
      source.dataset = { cases: [aReportCase({ startDate: day('2026-09-05') })], lawyers: [RIOS] };

      const report = await get.execute({ actor: admin, period: period('2026-09') });

      expect(report.data.dataAsOf).toBe('2026-09-30');
      expect(report.data.summary).toMatchObject({ activeCases: 1, admitted: 1 });
      expect([...repository.rows.keys()].sort()).toEqual(['2026-08', '2026-09']);
      expect(source.loads).toBe(1);
    });

    it('un mes cerrado con foto no se recalcula, aunque los datos hayan cambiado', async () => {
      source.dataset = { cases: [aReportCase()], lawyers: [RIOS] };
      const first = await get.execute({ actor: admin, period: period('2026-09') });
      source.dataset = { cases: [], lawyers: [] };
      source.loads = 0;

      const second = await get.execute({ actor: admin, period: period('2026-09') });

      expect(second.data).toEqual(first.data);
      expect(source.loads).toBe(0);
    });

    it('el mes en curso se calcula en cada pedido y no se guarda', async () => {
      source.dataset = { cases: [aReportCase()], lawyers: [RIOS] };

      const report = await get.execute({ actor: admin, period: period('2026-10') });

      expect(report.status).toBe('IN_PROGRESS');
      expect(report.data.dataAsOf).toBe('2026-10-06');
      // Solo las fotos de los meses cerrados que el gráfico necesita; nunca la del mes en curso.
      expect([...repository.rows.keys()].sort()).toEqual(['2026-08', '2026-09']);
    });

    // R-11, R-12
    it('las huérfanas llegan a unassigned y activeCases las incluye', async () => {
      source.dataset = { cases: [aReportCase(), orphan()], lawyers: [RIOS] };
      const report = await get.execute({ actor: admin, period: period('2026-10') });
      expect(report.data.unassigned).toEqual({ criminal: 1, administrative: 0, amparo: 0, total: 1 });
      expect(report.data.summary.activeCases).toBe(2);
      expect(report.data.summary.averagePerLawyer).toBe(1);
    });
  });

  describe('CloseMonthlyReport', () => {
    // R-29
    it('toma la foto de cada mes cerrado desde availableFrom que no la tenga', async () => {
      expect(await close.execute()).toEqual({ taken: ['2026-08', '2026-09'] });
      expect([...repository.rows.keys()].sort()).toEqual(['2026-08', '2026-09']);
    });

    it('es idempotente: la segunda corrida no encuentra nada que fotografiar ni vuelve a leer la base', async () => {
      await close.execute();
      source.loads = 0;
      expect(await close.execute()).toEqual({ taken: [] });
      expect(source.loads).toBe(0);
    });

    it('al cambiar de mes toma solo el mes que terminó', async () => {
      await close.execute();
      today = day('2026-11-02');
      expect(await close.execute()).toEqual({ taken: ['2026-10'] });
    });

    // R-21, S9
    it('el abogado dado de baja no figura en la foto del mes de su baja y sí en las anteriores', async () => {
      const BAJA = { id: 9, lastName: 'Baja', firstName: 'Ana', registrationNumber: null };
      source.dataset = { cases: [], lawyers: [RIOS, BAJA] };
      await close.execute(); // 1/10 al 6/10: fotos de agosto y septiembre, con Baja vigente

      // En octubre se lo da de baja; la foto de octubre se toma el 2/11, con los datos de entonces.
      source.dataset = { cases: [], lawyers: [RIOS] };
      today = day('2026-11-02');
      await close.execute();

      const october = await get.execute({ actor: admin, period: period('2026-10') });
      const september = await get.execute({ actor: admin, period: period('2026-09') });
      expect(october.data.lawyers.map((l) => l.lawyer.lastName)).toEqual(['Ríos']);
      expect(september.data.lawyers.map((l) => l.lawyer.lastName).sort()).toEqual(['Baja', 'Ríos']);
    });
  });
});
