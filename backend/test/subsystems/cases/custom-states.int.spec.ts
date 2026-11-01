import { deactivationData } from '../../shared/factories/case.factory';
import { INestApplication } from '@nestjs/common';
import request from 'supertest';

import { loginAs } from '../../shared/auth/login-as';
import { expectError } from '../../shared/contract/envelopes';
import { createClient } from '../../shared/factories/client.factory';
import { createLawyer } from '../../shared/factories/lawyer.factory';
import { createInitialState } from '../../shared/factories/procedural-state.factory';
import { createUser } from '../../shared/factories/user.factory';
import { getPrisma, startTestApp, stopTestApp } from '../../shared/harness/test-app';

const URL = '/api/v1/cases/custom-states';

/*
 * HU20, CA-20.4. Contrato: API_CONTRACT_V3.md §3.7 (GET /cases/custom-states).
 *
 * Alimenta el grupo "Escritos a mano en causas" del filtro de estado. Dos
 * cosas que este spec tiene que fijar y que no se ven en un test unitario:
 *
 *  1. Que la ruta exista. Está declarada ARRIBA de `@Get(':caseId')` en el
 *     controller, y si alguien las invierte, `custom-states` deja de resolver
 *     y pasa a responder 400 tomando "custom-states" como un caseId.
 *  2. Que la respuesta NO esté paginada: es `{ data: [...] }`, sin bloque
 *     `pagination`.
 */
describe('GET /api/v1/cases/custom-states', () => {
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
    await createInitialState('AMPARO');

    const lawyer = await createLawyer();
    const user = await createUser({ roles: ['SECRETARY'] });
    const client = await createClient();
    lawyerId = lawyer.id;
    userId = user.id;
    clientId = client.id;
    actor = loginAs({ userId, roles: ['SECRETARY'] });
  });

  /**
   * Causa con estado escrito a mano. El CHECK del schema exige exactamente uno
   * de (current_state_id, current_custom_state), así que el id va en null.
   */
  async function aCaseWithCustomState(
    customState: string,
    options: { jurisdiction?: 'CRIMINAL' | 'AMPARO'; active?: boolean } = {},
  ) {
    const jurisdiction = options.jurisdiction ?? 'CRIMINAL';
    const initial = await createInitialState(jurisdiction);
    return getPrisma().case.create({
      data: {
        caption: `CAUSA ${customState}`,
        jurisdictionId: initial.jurisdictionId,
        proceduralRole: jurisdiction === 'AMPARO' ? 'ACTORA' : 'DEFENSA',
        subjectMatter: jurisdiction === 'AMPARO' ? 'Objeto del amparo' : null,
        clientId,
        responsibleLawyerId: lawyerId,
        startDate: new Date('2021-03-12T00:00:00.000Z'),
        currentStateId: null,
        currentCustomState: customState,
        createdByUserId: userId,
        ...(options.active === false ? deactivationData(userId) : {}),
      },
    });
  }

  it('devuelve `{ data: [...] }` sin bloque de paginación', async () => {
    await aCaseWithCustomState('Con acusación, pero con oposición');

    const res = await request(app.getHttpServer()).get(URL).set(actor);

    expect(res.status).toBe(200);
    expect(res.body).toEqual({ data: ['Con acusación, pero con oposición'] });
    expect(res.body).not.toHaveProperty('pagination');
  });

  it('no repite un estado que tienen varias causas', async () => {
    await aCaseWithCustomState('Con oposición');
    await aCaseWithCustomState('Con oposición');
    await aCaseWithCustomState('En revisión');

    const res = await request(app.getHttpServer()).get(URL).set(actor);

    expect(res.body.data).toEqual(['Con oposición', 'En revisión']);
  });

  it('los ordena alfabéticamente', async () => {
    await aCaseWithCustomState('Zeta');
    await aCaseWithCustomState('Alfa');
    await aCaseWithCustomState('Medio');

    const res = await request(app.getHttpServer()).get(URL).set(actor);

    expect(res.body.data).toEqual(['Alfa', 'Medio', 'Zeta']);
  });

  it('no incluye los estados de causas dadas de baja', async () => {
    await aCaseWithCustomState('De una causa vigente');
    await aCaseWithCustomState('De una causa de baja', { active: false });

    const res = await request(app.getHttpServer()).get(URL).set(actor);

    expect(res.body.data).toEqual(['De una causa vigente']);
  });

  it('"Iniciada" nunca aparece, aunque haya causas en ese estado', async () => {
    // Una causa en el estado inicial guarda current_state_id, no un texto
    // escrito a mano, así que no puede entrar en esta lista.
    const initial = await createInitialState('CRIMINAL');
    await getPrisma().case.create({
      data: {
        caption: 'RECIEN REGISTRADA',
        jurisdictionId: initial.jurisdictionId,
        proceduralRole: 'DEFENSA',
        clientId,
        responsibleLawyerId: lawyerId,
        startDate: new Date('2021-03-12T00:00:00.000Z'),
        currentStateId: initial.stateId,
        createdByUserId: userId,
      },
    });

    const res = await request(app.getHttpServer()).get(URL).set(actor);

    expect(res.body.data).toEqual([]);
  });

  it('filtra por fuero, y acepta el código en minúsculas', async () => {
    await aCaseWithCustomState('Del penal', { jurisdiction: 'CRIMINAL' });
    await aCaseWithCustomState('Del amparo', { jurisdiction: 'AMPARO' });

    const penal = await request(app.getHttpServer()).get(URL).query({ jurisdiction: 'criminal' }).set(actor);
    const amparo = await request(app.getHttpServer()).get(URL).query({ jurisdiction: 'AMPARO' }).set(actor);

    expect(penal.body.data).toEqual(['Del penal']);
    expect(amparo.body.data).toEqual(['Del amparo']);
  });

  it('rechaza un fuero inexistente con INVALID_REQUEST', async () => {
    // "PENAL" es el rótulo; el código es CRIMINAL.
    const res = await request(app.getHttpServer()).get(URL).query({ jurisdiction: 'PENAL' }).set(actor);

    expectError(res, 400, 'INVALID_REQUEST', ['jurisdiction']);
  });

  it('la ruta resuelve a este endpoint y no a GET /cases/{caseId}', async () => {
    // Si alguien declara `@Get(':caseId')` antes que `@Get('custom-states')`,
    // este test falla con 400 INVALID_PATH_PARAMETER y nombra el problema.
    const res = await request(app.getHttpServer()).get(URL).set(actor);

    expect(res.status).toBe(200);
    expect(res.body.error).toBeUndefined();
  });

  it('responde 401 sin token', async () => {
    const res = await request(app.getHttpServer()).get(URL);

    expectError(res, 401, 'UNAUTHENTICATED');
  });
});
