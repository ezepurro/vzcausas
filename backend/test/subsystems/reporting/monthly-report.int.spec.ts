import { INestApplication } from '@nestjs/common';
import request from 'supertest';

import { MONTHLY_REPORT_AVAILABLE_FROM } from '../../../src/subsystems/reporting/core/application/ports/monthly-report-config.port';
import { getPrisma, startTestApp, stopTestApp } from '../../shared/harness/test-app';
import { withFixedClock } from '../../shared/harness/fixed-clock';
import { expectData, expectError } from '../../shared/contract/envelopes';
import { loginAs } from '../../shared/auth/login-as';
import { createCase, deactivateCase } from '../../shared/factories/case.factory';
import { createLegalQualification } from '../../shared/factories/legal-qualification.factory';
import {
  ProceduralActScenario,
  resetProceduralActData,
  setUpProceduralActScenario,
} from '../../shared/factories/procedural-act-scenario';

/*
 * HU43 — GET /reports/monthly y GET /reports/monthly/file (API_CONTRACT_V6.md §3.13).
 * Escrito desde `.claude/plans/tests-hu43-reporte-general.md` (R-n), no desde el código.
 * El 401 está en el smoke.
 *
 * "Hoy" es el martes 6/10/2026; `availableFrom` es 2026-08. El mes en curso es 2026-10 y el
 * último cerrado, 2026-09 (corte: 30/9). El escenario trae a Ríos (vigente, con una causa
 * penal iniciada en 2021) y otro abogado vigente sin causas.
 */
type Body = Record<string, any>;
const URL = '/api/v1/reports/monthly';
const FILE_URL = `${URL}/file`;
const QUALIFICATION = 'Reporte calificación';

describe('Reporte mensual (HU43)', () => {
  let app: INestApplication;
  let s: ProceduralActScenario;

  const server = () => request(app.getHttpServer());
  const snapshotRows = () => getPrisma().monthlyReportSnapshot.findMany({ orderBy: { period: 'asc' } });
  const report = async (period?: string): Promise<Body> =>
    expectData<Body>(await server().get(URL).query(period ? { period } : {}).set(s.administrator), 200);

  /** Una causa huérfana (D-143) con un hecho del 6/10/2018 de 120 meses: 80 % de su plazo al 30/9/2026. */
  const orphanWithPrescription = async () => {
    const orphan = await createCase({ clientId: s.client.id, responsibleLawyerId: null, createdByUserId: s.user.id });
    const qualification = await createLegalQualification({ name: `${QUALIFICATION} 1`, prescriptionMonths: 120 });
    await getPrisma().offense.create({
      data: {
        caseId: orphan.id,
        legalQualificationId: qualification.id,
        offenseDate: new Date('2018-10-06T00:00:00.000Z'),
        prescriptionDate: new Date('2028-10-06T00:00:00.000Z'),
      },
    });
    return orphan;
  };

  beforeAll(async () => {
    app = await startTestApp((builder) =>
      withFixedClock(builder).overrideProvider(MONTHLY_REPORT_AVAILABLE_FROM).useValue('2026-08'),
    );
  });

  afterAll(async () => {
    await getPrisma().monthlyReportSnapshot.deleteMany();
    await resetProceduralActData();
    await getPrisma().legalQualification.deleteMany({ where: { name: { startsWith: QUALIFICATION } } });
    await stopTestApp();
  });

  beforeEach(async () => {
    await getPrisma().monthlyReportSnapshot.deleteMany();
    // El escenario borra primero las causas y sus hechos; recién después se pueden borrar las
    // calificaciones de este spec (un hecho las referencia con `Restrict`).
    s = await setUpProceduralActScenario();
    await getPrisma().legalQualification.deleteMany({ where: { name: { startsWith: QUALIFICATION } } });
  });

  describe(`GET ${URL}`, () => {
    // R-4, R-11, R-12, R-13, R-16, R-17, R-22, R-23
    it('mes cerrado: forma exacta del contrato, con la huérfana solo como número y las causas fuera del reporte sin contar', async () => {
      await orphanWithPrescription();
      // Fuera del reporte: sin fecha de inicio (D-129) y dada de baja (D-97).
      await createCase({ clientId: s.client.id, responsibleLawyerId: s.lawyer.id, createdByUserId: s.user.id, startDate: null });
      const deactivated = await createCase({ clientId: s.client.id, responsibleLawyerId: s.lawyer.id, createdByUserId: s.user.id });
      await deactivateCase(deactivated.id);

      const data = await report('2026-09');

      expect(Object.keys(data).sort()).toEqual([
        'availableFrom',
        'byJurisdiction',
        'currentPeriod',
        'dataAsOf',
        'lawyers',
        'monthly',
        'period',
        'prescription',
        'summary',
        'unassigned',
      ]);
      expect(Object.keys(data.summary).sort()).toEqual([
        'activeCases',
        'admitted',
        'admittedChange',
        'archived',
        'archivedChange',
        'averagePerLawyer',
        'maxPerLawyer',
        'minPerLawyer',
      ]);
      expect(data).toMatchObject({ period: '2026-09', dataAsOf: '2026-09-30', availableFrom: '2026-08', currentPeriod: '2026-10' });
      // Ríos tiene 1 causa y la huérfana 1: activeCases = lawyers + unassigned (D-145).
      expect(data.summary).toEqual({
        activeCases: 2,
        admitted: 0,
        archived: 0,
        admittedChange: 0,
        archivedChange: 0,
        averagePerLawyer: 0.5,
        minPerLawyer: 0,
        maxPerLawyer: 1,
      });
      expect(data.unassigned).toEqual({ criminal: 1, administrative: 0, amparo: 0, total: 1 });
      expect(data.byJurisdiction).toEqual([
        { jurisdiction: 'CRIMINAL', atEnd: 2, percentage: 100 },
        { jurisdiction: 'ADMINISTRATIVE', atEnd: 0, percentage: 0 },
        { jurisdiction: 'AMPARO', atEnd: 0, percentage: 0 },
      ]);
      expect(data.lawyers).toHaveLength(2);
      expect(Object.keys(data.lawyers[0]).sort()).toEqual(['administrative', 'amparo', 'criminal', 'lawyer', 'total']);
      expect(Object.keys(data.lawyers[0].lawyer).sort()).toEqual(['firstName', 'id', 'lastName']);
      expect(data.lawyers[0]).toMatchObject({ lawyer: { id: s.lawyer.id }, criminal: 1, total: 1 });
      expect(data.monthly.map((m: Body) => m.period)).toEqual([
        '2026-01', '2026-02', '2026-03', '2026-04', '2026-05', '2026-06', '2026-07', '2026-08', '2026-09',
      ]);
      expect(data.monthly[0]).toEqual({ period: '2026-01', admitted: null, archived: null });
      expect(Object.keys(data.monthly[8]).sort()).toEqual(['admitted', 'archived', 'period']);
      expect(data.prescription).toEqual({
        cases: 1,
        bands: [
          { band: 'UNDER_50', cases: 0 },
          { band: 'FROM_50_TO_70', cases: 0 },
          { band: 'FROM_70_TO_90', cases: 1 },
          { band: 'FROM_90', cases: 0 },
        ],
      });
    });

    // R-19, R-20, R-27, S10
    it('la foto del mes cerrado no cambia, el mes en curso sí, y solo se escribe monthly_report_snapshots', async () => {
      const before = { cases: await getPrisma().case.count(), acts: await getPrisma().proceduralAct.count() };

      const first = await report('2026-09');
      expect((await snapshotRows()).map((r) => r.period)).toEqual(['2026-08', '2026-09']);

      await deactivateCase(s.caseRow.id);

      expect(await report('2026-09')).toEqual(first);
      const current = await report('2026-10');
      expect(current.summary.activeCases).toBe(0);
      expect(first.summary.activeCases).toBe(1);
      // El mes en curso no se guarda y la base de negocio sigue igual.
      expect((await snapshotRows()).map((r) => r.period)).toEqual(['2026-08', '2026-09']);
      expect(await getPrisma().case.count()).toBe(before.cases);
      expect(await getPrisma().proceduralAct.count()).toBe(before.acts);
    });

    // R-28
    it('dos pedidos simultáneos del mismo mes dejan una sola foto por mes y devuelven lo mismo', async () => {
      const [a, b] = await Promise.all([
        server().get(URL).query({ period: '2026-09' }).set(s.administrator),
        server().get(URL).query({ period: '2026-09' }).set(s.administrator),
      ]);
      expect(a.status).toBe(200);
      expect(b.body).toEqual(a.body);
      expect((await snapshotRows()).map((r) => r.period)).toEqual(['2026-08', '2026-09']);
    });
  });

  describe('Errores', () => {
    // R-1, R-3, R-24
    it('400, 403 y 404 textuales, y un pedido rechazado no escribe nada', async () => {
      const invalid = await server().get(URL).query({ period: '2026-13' }).set(s.administrator);
      expectError(invalid, 400, 'INVALID_REQUEST', ['period']);
      expect(invalid.body.error.message).toBe('Parámetros de query inválidos.');
      expect(invalid.body.error.details).toEqual({ period: 'Debe tener el formato AAAA-MM.' });

      for (const roles of [['LAWYER'], ['SECRETARY']] as const) {
        const forbidden = await server().get(URL).set(loginAs({ userId: s.user.id, roles: [...roles], lawyerId: s.lawyer.id }));
        expectError(forbidden, 403, 'FORBIDDEN');
        expect(forbidden.body.error.message).toBe('Se requiere el rol ADMINISTRATOR para realizar esta operación.');
      }

      for (const period of ['2026-07', '2026-11']) {
        const notFound = await server().get(URL).query({ period }).set(s.administrator);
        expectError(notFound, 404, 'MONTHLY_REPORT_NOT_FOUND');
        expect(notFound.body.error.message).toBe('No hay reporte para ese período.');
      }
      expect(await snapshotRows()).toEqual([]);
    });
  });

  describe(`GET ${FILE_URL}`, () => {
    // R-25
    it('devuelve el PDF del mes con las cabeceras del contrato; inline si se pide', async () => {
      await orphanWithPrescription();

      const res = await server().get(FILE_URL).query({ period: '2026-08' }).set(s.administrator).buffer(true).parse((r, cb) => {
        const chunks: Buffer[] = [];
        r.on('data', (c: Buffer) => chunks.push(c));
        r.on('end', () => cb(null, Buffer.concat(chunks)));
      });

      expect(res.status).toBe(200);
      expect(res.headers['content-type']).toMatch(/^application\/pdf/);
      expect(res.headers['content-disposition']).toContain('attachment; filename="Reporte_2026-08.pdf"');
      expect((res.body as Buffer).subarray(0, 5).toString()).toBe('%PDF-');

      const inline = await server().get(FILE_URL).query({ period: '2026-08', disposition: 'inline' }).set(s.administrator);
      expect(inline.headers['content-disposition']).toContain('inline; filename="Reporte_2026-08.pdf"');
    });

    it('400 con disposition inválido, 403 a un abogado y 404 fuera de rango', async () => {
      const invalid = await server().get(FILE_URL).query({ disposition: 'otro' }).set(s.administrator);
      expectError(invalid, 400, 'INVALID_REQUEST', ['disposition']);
      expect(invalid.body.error.details).toEqual({ disposition: 'Debe ser inline o attachment.' });

      expectError(await server().get(FILE_URL).set(s.responsible), 403, 'FORBIDDEN');
      expectError(await server().get(FILE_URL).query({ period: '2026-07' }).set(s.administrator), 404, 'MONTHLY_REPORT_NOT_FOUND');
    });
  });
});
