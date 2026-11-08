import { INestApplication } from '@nestjs/common';
import request from 'supertest';

import { getPrisma, startTestApp, stopTestApp } from '../../shared/harness/test-app';
import { withFixedClock } from '../../shared/harness/fixed-clock';
import { purgeAuditLog } from '../../shared/harness/audit-log';
import { expectData, expectError } from '../../shared/contract/envelopes';
import { loginAs } from '../../shared/auth/login-as';
import { createCase } from '../../shared/factories/case.factory';
import { createLegalQualification } from '../../shared/factories/legal-qualification.factory';
import { createUser } from '../../shared/factories/user.factory';
import {
  ProceduralActScenario,
  resetProceduralActData,
  setUpProceduralActScenario,
} from '../../shared/factories/procedural-act-scenario';

/*
 * HU19 · Modificar causa: PATCH /cases/{caseId} (contrato V5 §3.7).
 *
 * Escrito desde `.claude/plans/tests-hu19-modificar-causa.md`, no desde el
 * código. Reloj fijo: hoy es 06/10/2026. La causa de referencia es la del
 * escenario de actos procesales: penal, en "Iniciada", sin SAC, responsable
 * Ríos, Malena. Modifica una secretaria, que opera cualquier causa (D-110).
 */
type Body = Record<string, any>;
const NOW = new Date('2026-10-06T15:30:00.000Z');

describe('PATCH /api/v1/cases/:caseId', () => {
  let app: INestApplication;
  let s: ProceduralActScenario;
  let secretary: { id: number; auth: { Authorization: string } };

  const server = () => request(app.getHttpServer());
  const url = (id: number | string = s.caseRow.id) => `/api/v1/cases/${id}`;
  const patch = (body: unknown, id?: number | string) =>
    server().patch(url(id)).set(secretary.auth).set('X-Correlation-Id', 'corr-hu19').send(body as object);

  /** Lo que un rechazo no puede tocar: la causa, sus calificaciones y la auditoría. */
  const snapshot = async (id: number = s.caseRow.id) => ({
    caseRow: await getPrisma().case.findUnique({ where: { id } }),
    offenses: await getPrisma().offense.count({ where: { caseId: id } }),
    audit: await getPrisma().auditLog.count(),
  });

  const newCase = (overrides: Partial<Parameters<typeof createCase>[0]> = {}) =>
    createCase({ clientId: s.client.id, responsibleLawyerId: s.lawyer.id, createdByUserId: s.user.id, ...overrides });

  beforeAll(async () => {
    app = await startTestApp(withFixedClock);
  });

  afterAll(async () => {
    await purgeAuditLog();
    await resetProceduralActData();
    await getPrisma().legalQualification.deleteMany({ where: { name: { startsWith: 'HU19 ' } } });
    await stopTestApp();
  });

  beforeEach(async () => {
    // Antes de borrar usuarios: la auditoría los referencia.
    await purgeAuditLog();
    s = await setUpProceduralActScenario();
    const user = await createUser({ roles: ['SECRETARY'] });
    secretary = { id: user.id, auth: loginAs({ userId: user.id, roles: ['SECRETARY'] }) };
  });

  describe('modificación exitosa', () => {
    // CA-19.1
    it('responde 200 con la causa como la muestra GET; lo omitido no cambia y un anulable en null se vacía', async () => {
      await getPrisma().case.update({ where: { id: s.caseRow.id }, data: { instructorName: 'Dra. Ledesma' } });

      const res = await patch({ court: ' Juzgado de Control N° 3 ', instructorName: null, courtFeePaid: true });

      const data = expectData<Body>(res, 200);
      const detail = expectData<Body>(await server().get(url()).set(secretary.auth), 200);
      expect(data).toEqual(detail);
      expect(data).toMatchObject({
        court: 'Juzgado de Control N° 3',
        instructorName: null,
        courtFeePaid: true,
        caption: s.caseRow.caption,
      });
    });

    // CA-19.15
    it('deja una fila de auditoría: quién, cuándo y qué campos, sin sus valores', async () => {
      await patch({ court: 'Juzgado de Control N° 3', courtFeePaid: true }).expect(200);

      const rows = await getPrisma().auditLog.findMany();
      expect(rows).toHaveLength(1);
      expect(rows[0]).toMatchObject({
        actorUserId: secretary.id,
        action: 'case.updated',
        entityType: 'Case',
        entityId: String(s.caseRow.id),
        occurredAt: NOW,
        metadata: { changedFields: ['court', 'courtFeePaid'] },
        correlationId: 'corr-hu19',
      });
      expect(JSON.stringify(rows[0].metadata)).not.toContain('Juzgado');
    });
  });

  describe('datos inválidos', () => {
    // CA-19.4, CA-19.5, CA-19.6
    it.each<[string, Body, Record<string, string>]>([
      ['un SAC sin fecha de inicio', { sacNumber: '13284571', startDate: null }, { startDate: 'Es obligatoria cuando se informa el número de SAC.' }],
      ['una fecha de inicio sin SAC', { startDate: '2021-01-01' }, { startDate: 'Sin número de SAC la causa no tiene fecha de inicio.' }],
      ['un SAC que no son 8 dígitos', { sacNumber: '1328457' }, { sacNumber: 'Debe contener exactamente 8 dígitos.' }],
      ['una carátula vacía', { caption: '   ' }, { caption: 'Es obligatoria.' }],
      ['un dato de otro fuero', { subjectMatter: 'Objeto' }, { subjectMatter: 'No se informa en el fuero penal.' }],
      ['un campo que la causa siempre tiene, en null', { courtFeePaid: null }, { courtFeePaid: 'No puede quedar vacío.' }],
    ])('%s: 400 sobre el campo y no se escribe nada', async (_case, body, details) => {
      const before = await snapshot();

      const res = await patch(body);

      expectError(res, 400, 'VALIDATION_ERROR', Object.keys(details));
      expect(res.body.error.message).toBe('Los datos enviados no son válidos.');
      expect(res.body.error.details).toEqual(details);
      expect(await snapshot()).toEqual(before);
    });

    // CA-19.2, CA-19.3
    it.each<[string, Body, Record<string, string>]>([
      ['sin ningún campo', {}, { body: 'Debe enviarse al menos un campo para modificar.' }],
      ['con jurisdiction', { jurisdiction: 'AMPARO' }, { jurisdiction: 'El fuero de una causa no se puede modificar.' }],
      ['con clientId', { clientId: 1 }, { clientId: 'El cliente de una causa no se puede modificar.' }],
      ['con active', { active: false }, { active: 'No es un campo admitido.' }],
    ])('%s: 400 y no se escribe nada', async (_case, body, details) => {
      const before = await snapshot();

      const res = await patch(body);

      expectError(res, 400, 'VALIDATION_ERROR', Object.keys(details));
      expect(res.body.error.details).toEqual(details);
      expect(await snapshot()).toEqual(before);
    });
  });

  describe('SAC y existencia', () => {
    // CA-19.5
    it('el SAC de otra causa vigente es 409 y no se escribe nada', async () => {
      await newCase({ sacNumber: '13284571' });
      const before = await snapshot();

      const res = await patch({ sacNumber: '13284571', court: 'Juzgado N° 3' });

      expectError(res, 409, 'CASE_SAC_ALREADY_EXISTS');
      expect(res.body.error.message).toBe('Ya existe una causa registrada con ese número de SAC.');
      expect(await snapshot()).toEqual(before);
    });

    it('el SAC de una causa dada de baja se puede usar (D-97)', async () => {
      const old = await newCase({ sacNumber: '20000001' });
      await getPrisma().case.update({
        where: { id: old.id },
        data: { active: false, deactivatedAt: NOW, deactivatedByUserId: s.user.id },
      });

      const data = expectData<Body>(await patch({ sacNumber: '20000001' }), 200);

      expect(data.sacNumber).toBe('20000001');
    });

    // CA-19.14
    it('una causa inexistente o dada de baja es 404; un id no entero, 400', async () => {
      const gone = await newCase();
      await getPrisma().case.update({
        where: { id: gone.id },
        data: { active: false, deactivatedAt: NOW, deactivatedByUserId: s.user.id },
      });

      for (const id of [999999, gone.id]) {
        const res = await patch({ court: 'Juzgado N° 3' }, id);
        expectError(res, 404, 'CASE_NOT_FOUND');
        expect(res.body.error.message).toBe('No se encontró la causa solicitada.');
      }
      const invalid = await patch({ court: 'Juzgado N° 3' }, 'abc');
      expectError(invalid, 400, 'INVALID_PATH_PARAMETER', ['caseId']);
    });
  });

  // D-110: quién opera la causa. Primero 404, después 403.
  describe('quién la modifica (D-110)', () => {
    const otherLawyer = () => loginAs({ roles: ['LAWYER'], lawyerId: s.lawyer.id + 1000 });
    const patchAs = (auth: { Authorization: string }, body: unknown, id?: number | string) =>
      server().patch(url(id)).set(auth).send(body as object);

    it('otro abogado: 403 con el texto del contrato y no se escribe nada', async () => {
      const before = await snapshot();

      const res = await patchAs(otherLawyer(), { court: 'Juzgado N° 9' });

      expectError(res, 403, 'FORBIDDEN');
      expect(res.body.error.message).toBe('Solo el abogado responsable de la causa puede modificarla.');
      expect(res.body.error.details).toBeNull();
      expect(await snapshot()).toEqual(before);
    });

    it.each<[string, { roles: ('ADMINISTRATOR' | 'LAWYER' | 'SECRETARY')[]; ownLawyer: boolean }]>([
      ['el abogado responsable', { roles: ['LAWYER'], ownLawyer: true }],
      ['un ADMINISTRATOR que no es el responsable', { roles: ['ADMINISTRATOR'], ownLawyer: false }],
      ['un abogado con rol SECRETARY que no es el responsable', { roles: ['LAWYER', 'SECRETARY'], ownLawyer: false }],
    ])('%s: 200', async (_name, { roles, ownLawyer }) => {
      const user = await createUser({ roles });
      const auth = loginAs({ userId: user.id, roles, lawyerId: ownLawyer ? s.lawyer.id : null });

      const res = await patchAs(auth, { court: 'Juzgado N° 9' });

      expect(expectData<Body>(res, 200).court).toBe('Juzgado N° 9');
    });

    it('una causa inexistente es 404 aunque pida otro abogado', async () => {
      expectError(await patchAs(otherLawyer(), { court: 'Juzgado N° 9' }, 999999), 404, 'CASE_NOT_FOUND');
    });
  });

  describe('cliente, responsable y calificaciones', () => {
    // CA-19.8
    it('el responsable nuevo registra los actos desde la próxima petición; los anteriores conservan su registeredBy', async () => {
      const actsUrl = `/api/v1/cases/${s.caseRow.id}/procedural-acts`;
      const act = { proceduralStateId: s.states.fiveBusinessDays.stateId, actDate: '2026-10-01' };
      const first = expectData<Body>(await server().post(actsUrl).set(s.responsible).send(act), 201);

      await patch({ responsibleLawyerId: s.otherLawyer.id }).expect(200);

      expectError(await server().post(actsUrl).set(s.responsible).send({ ...act, actDate: '2026-10-02' }), 403, 'FORBIDDEN');
      expectData(await server().post(actsUrl).set(s.notResponsible).send({ ...act, actDate: '2026-10-02' }), 201);
      const reread = expectData<Body>(await server().get(`${actsUrl}/${first.id}`).set(secretary.auth), 200);
      expect(reread.registeredBy.id).toBe(first.registeredBy.id);
    });

    // CA-19.11
    it('las calificaciones reemplazan la lista entera, y [] la vacía', async () => {
      const robbery = await createLegalQualification({ name: 'HU19 Robo', prescriptionMonths: 96 });

      const with1 = expectData<Body>(
        await patch({ legalQualifications: [{ legalQualificationId: robbery.id, offenseDate: '2021-02-27' }] }),
        200,
      );
      expect(with1.legalQualifications.map((q: Body) => q.id)).toEqual([robbery.id]);
      expect(with1.prescription).not.toBeNull();

      const without = expectData<Body>(await patch({ legalQualifications: [] }), 200);
      expect(without.legalQualifications).toEqual([]);
      expect(without.prescription).toBeNull();
      expect(await getPrisma().offense.count({ where: { caseId: s.caseRow.id } })).toBe(0);
    });
  });

  describe('amparo y estados terminales', () => {
    // CA-19.12
    it('cambiar el acto lesivo recalcula su vencimiento, y harmfulActDate en null lo borra', async () => {
      const amparo = await newCase({
        jurisdiction: 'AMPARO',
        harmfulAct: { date: '2026-10-01', termDays: 5, termDayType: 'BUSINESS' },
      });

      const longer = expectData<Body>(await patch({ harmfulActTermDays: 10 }, amparo.id), 200);
      expect(longer.harmfulActTermDays).toBe(10);
      expect(longer.harmfulActDeadline).toMatchObject({ dueDate: '2026-10-15' });

      const cleared = expectData<Body>(await patch({ harmfulActDate: null }, amparo.id), 200);
      expect(cleared).toMatchObject({
        harmfulActDate: null,
        harmfulActRenews: false,
        harmfulActTermDays: null,
        harmfulActTermDayType: null,
        harmfulActDeadline: null,
      });
    });

    // CA-19.13
    it('una causa archivada se corrige; una prescripta no admite calificaciones (422) y no se escribe nada', async () => {
      const archived = await newCase({ currentStateId: s.states.terminal.stateId });
      expect(expectData<Body>(await patch({ court: 'Juzgado N° 3' }, archived.id), 200).court).toBe('Juzgado N° 3');

      const prescribed = await newCase({
        currentStateId: s.states.prescribed.stateId,
        prescriptionDeclaration: {
          prescriptionDate: '2026-09-15',
          resolution: 'Sentencia N° 214',
          registeredByUserId: s.user.id,
          registeredAt: NOW,
        },
      });
      const before = await snapshot(prescribed.id);

      const res = await patch({ legalQualifications: [] }, prescribed.id);

      expectError(res, 422, 'CASE_IN_TERMINAL_STATE');
      expect(res.body.error.message).toBe('La causa se encuentra en un estado terminal y no admite esta operación.');
      expect(await snapshot(prescribed.id)).toEqual(before);
    });
  });
});
