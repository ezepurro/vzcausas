import { INestApplication } from '@nestjs/common';
import request from 'supertest';

import { loginAs } from '../../shared/auth/login-as';
import { expectData, expectError, expectPaginated } from '../../shared/contract/envelopes';
import { createClient } from '../../shared/factories/client.factory';
import { createLawyer } from '../../shared/factories/lawyer.factory';
import {
  createInitialState,
  createProceduralState,
} from '../../shared/factories/procedural-state.factory';
import { createUser } from '../../shared/factories/user.factory';
import { getPrisma, startTestApp, stopTestApp } from '../../shared/harness/test-app';

const URL = '/api/v1/cases';

/*
 * HU22 Consultar detalle de causa. Contrato: API_CONTRACT_V3.md §3.7
 * (GET /cases/{caseId}).
 *
 * Lo que este spec tiene que fijar, por encima de todo: que el detalle
 * devuelva **el mismo recurso que el listado**. Si divergen, es un bug, y es
 * un bug silencioso porque los dos endpoints "funcionan" por separado.
 */
describe('GET /api/v1/cases/{caseId}', () => {
  let app: INestApplication;
  let actor: { Authorization: string };
  let userId: number;
  let lawyerId: number;
  let clientId: number;

  beforeAll(async () => {
    app = await startTestApp();
  });

  afterAll(async () => {
    await stopTestApp();
  });

  beforeEach(async () => {
    const prisma = getPrisma();
    await prisma.offense.deleteMany();
    await prisma.case.updateMany({ data: { currentProceduralActId: null } });
    await prisma.proceduralAct.deleteMany();
    await prisma.case.deleteMany();
    await prisma.user.deleteMany();
    await prisma.lawyer.deleteMany();
    await prisma.client.deleteMany();
    await prisma.proceduralState.deleteMany();

    await createInitialState('CRIMINAL');

    const lawyer = await createLawyer();
    const user = await createUser({ roles: ['SECRETARY'] });
    const client = await createClient({ lastName: 'GÓMEZ', firstName: 'Ariel Fernando' });
    lawyerId = lawyer.id;
    userId = user.id;
    clientId = client.id;
    actor = loginAs({ userId, roles: ['SECRETARY'] });
  });

  async function aCase(caption = 'CAUSA') {
    const initial = await createInitialState('CRIMINAL');
    return getPrisma().case.create({
      data: {
        sacNumber: '13284571',
        caption,
        court: 'Juzgado de Control N° 3 · Córdoba',
        jurisdictionId: initial.jurisdictionId,
        proceduralRole: 'DEFENSA',
        instructorName: 'Dra. Verónica Ledesma',
        instructorPhone: '0351 448-1200',
        instructorExtension: '214',
        clientId,
        responsibleLawyerId: lawyerId,
        startDate: new Date('2021-03-12T00:00:00.000Z'),
        currentStateId: initial.stateId,
        createdByUserId: userId,
      },
    });
  }

  it('devuelve el recurso en el sobre `{ data }`, no paginado', async () => {
    const created = await aCase();

    const res = await request(app.getHttpServer()).get(`${URL}/${created.id}`).set(actor);
    const item = expectData<Record<string, unknown>>(res, 200);

    expect(item).toMatchObject({
      id: created.id,
      sacNumber: '13284571',
      caption: 'CAUSA',
      court: 'Juzgado de Control N° 3 · Córdoba',
      jurisdiction: 'CRIMINAL',
      instructorName: 'Dra. Verónica Ledesma',
      // La columna es `instructor_phone`; el contrato lo llama `tribunalPhone`.
      tribunalPhone: '0351 448-1200',
      instructorExtension: '214',
      counterparty: null,
      subjectMatter: null,
      client: { id: clientId, lastName: 'GÓMEZ', firstName: 'Ariel Fernando' },
      responsibleLawyer: { id: lawyerId },
      legalQualifications: [],
      startDate: '2021-03-12',
      active: true,
    });
  });

  it('devuelve EXACTAMENTE el mismo objeto que el listado', async () => {
    // Es la razón de ser del mapper compartido. Si alguien agrega un campo en
    // un endpoint y se olvida del otro, este test lo atrapa.
    const created = await aCase();
    const state = await createProceduralState({ name: 'Alegato' });
    const act = await getPrisma().proceduralAct.create({
      data: {
        caseId: created.id,
        proceduralStateId: state.stateId,
        actDate: new Date('2026-09-01T00:00:00.000Z'),
        deadlineTimeLimitDays: 5,
        deadlineDayType: 'BUSINESS',
        deadlineCountsFrom: new Date('2026-09-01T00:00:00.000Z'),
        deadlineComputedDueDate: new Date('2026-09-16T00:00:00.000Z'),
        registeredByUserId: userId,
        registeredByLawyerId: lawyerId,
      },
    });
    await getPrisma().case.update({
      where: { id: created.id },
      data: { currentStateId: state.stateId, currentProceduralActId: act.id },
    });

    const detalle = await request(app.getHttpServer()).get(`${URL}/${created.id}`).set(actor);
    const listado = await request(app.getHttpServer()).get(URL).set(actor);

    const [delListado] = expectPaginated(listado);
    expect(expectData(detalle, 200)).toEqual(delListado);
  });

  it('en el estado inicial manda proceduralStateId en null y sin vencimiento', async () => {
    const created = await aCase();

    const res = await request(app.getHttpServer()).get(`${URL}/${created.id}`).set(actor);
    const item = expectData<{ currentState: Record<string, unknown> }>(res, 200);

    expect(item.currentState).toEqual({
      proceduralStateId: null,
      name: 'Iniciada',
      custom: false,
      initial: true,
      proceduralActId: null,
      dueDate: null,
      businessDaysRemaining: null,
      manuallyAdjusted: false,
    });
  });

  it('muestra un estado escrito a mano con su texto y sin id', async () => {
    const created = await aCase();
    const act = await getPrisma().proceduralAct.create({
      data: {
        caseId: created.id,
        customState: 'Con acusación, pero con oposición',
        actDate: new Date('2026-09-01T00:00:00.000Z'),
        deadlineTimeLimitDays: 5,
        deadlineDayType: 'BUSINESS',
        deadlineCountsFrom: new Date('2026-09-01T00:00:00.000Z'),
        registeredByUserId: userId,
        registeredByLawyerId: lawyerId,
      },
    });
    await getPrisma().case.update({
      where: { id: created.id },
      data: {
        currentStateId: null,
        currentCustomState: 'Con acusación, pero con oposición',
        currentProceduralActId: act.id,
      },
    });

    const res = await request(app.getHttpServer()).get(`${URL}/${created.id}`).set(actor);
    const item = expectData<{ currentState: Record<string, unknown> }>(res, 200);

    expect(item.currentState).toMatchObject({
      proceduralStateId: null,
      name: 'Con acusación, pero con oposición',
      custom: true,
      initial: false,
    });
  });

  describe('errores', () => {
    it('responde 404 CASE_NOT_FOUND para una causa inexistente', async () => {
      const res = await request(app.getHttpServer()).get(`${URL}/999999`).set(actor);

      expectError(res, 404, 'CASE_NOT_FOUND');
    });

    it('responde 404 para una causa dada de baja: no se distingue de una inexistente', async () => {
      const created = await aCase();
      await getPrisma().case.update({ where: { id: created.id }, data: { active: false } });

      const res = await request(app.getHttpServer()).get(`${URL}/${created.id}`).set(actor);

      expectError(res, 404, 'CASE_NOT_FOUND');
    });

    it.each([['abc'], ['0'], ['-3'], ['1.5']])(
      'responde 400 INVALID_PATH_PARAMETER ante un caseId "%s"',
      async (raw) => {
        const res = await request(app.getHttpServer()).get(`${URL}/${raw}`).set(actor);

        expectError(res, 400, 'INVALID_PATH_PARAMETER', ['caseId']);
      },
    );

    it('responde 401 sin token', async () => {
      const created = await aCase();

      const res = await request(app.getHttpServer()).get(`${URL}/${created.id}`);

      expectError(res, 401, 'UNAUTHENTICATED');
    });
  });
});
