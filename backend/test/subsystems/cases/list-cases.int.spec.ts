import { INestApplication } from '@nestjs/common';
import request from 'supertest';

import { loginAs } from '../../shared/auth/login-as';
import { expectError, expectPaginated } from '../../shared/contract/envelopes';
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
 * HU20 Consultar causas. Contrato: API_CONTRACT_V3.md §3.7 (GET /cases).
 *
 * Complementa a `case-query.int.spec.ts`, que prueba el puerto de lectura
 * directo. Acá se prueba lo que sólo existe pasando por HTTP: el sobre
 * `{ data, pagination }`, la validación del ValidationPipe con sus dos códigos
 * de error distintos, y `businessDaysRemaining`, que lo llena el caso de uso.
 *
 * Los vencimientos se arman RELATIVOS a hoy, no con fechas fijas: el reloj de
 * la app es real en integración, así que una fecha fija haría que el signo de
 * `businessDaysRemaining` dependiera del día en que se corre la suite.
 */
const MS_PER_DAY = 24 * 60 * 60 * 1000;

/** Hoy a medianoche UTC, como lee una columna `date`. */
function today(): Date {
  const now = new Date();
  return new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate()));
}

function daysFromToday(days: number): Date {
  return new Date(today().getTime() + days * MS_PER_DAY);
}

describe('GET /api/v1/cases', () => {
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
        sacNumber: null,
        caption,
        jurisdictionId: initial.jurisdictionId,
        proceduralRole: 'DEFENSA',
        clientId,
        responsibleLawyerId: lawyerId,
        startDate: new Date('2021-03-12T00:00:00.000Z'),
        currentStateId: initial.stateId,
        createdByUserId: userId,
      },
    });
  }

  /** Lleva la causa a un estado de la tabla, con vencimiento relativo a hoy. */
  async function withDeadline(caseId: number, dueInDays: number) {
    const prisma = getPrisma();
    const state = await createProceduralState({ name: `Estado ${caseId}` });
    const act = await prisma.proceduralAct.create({
      data: {
        caseId,
        proceduralStateId: state.stateId,
        actDate: daysFromToday(-10),
        deadlineTimeLimitDays: 5,
        deadlineDayType: 'BUSINESS',
        deadlineCountsFrom: daysFromToday(-10),
        deadlineComputedDueDate: daysFromToday(dueInDays),
        registeredByUserId: userId,
        registeredByLawyerId: lawyerId,
      },
    });
    await prisma.case.update({
      where: { id: caseId },
      data: { currentStateId: state.stateId, currentProceduralActId: act.id },
    });
  }

  it('devuelve el sobre paginado con el recurso en la forma del contrato', async () => {
    await aCase('GÓMEZ, Ariel Fernando p.s.a. Robo calificado');

    const res = await request(app.getHttpServer()).get(URL).set(actor);
    const [item] = expectPaginated(res, { page: 1, limit: 20, totalItems: 1, totalPages: 1 });

    // Las 18 claves del recurso, exactamente (§3.7). Si falta o sobra una, falla.
    expect(Object.keys(item as object).sort()).toEqual(
      [
        'active',
        'caption',
        'client',
        'counterparty',
        'court',
        'currentState',
        'folder',
        'id',
        'instructorExtension',
        'instructorName',
        'jurisdiction',
        'legalQualifications',
        'proceduralRole',
        'responsibleLawyer',
        'sacNumber',
        'startDate',
        'subjectMatter',
        'tribunalPhone',
      ].sort(),
    );
    expect(item).toMatchObject({
      sacNumber: null, // una causa sin SAC es válida (D-33)
      jurisdiction: 'CRIMINAL',
      client: { id: clientId, lastName: 'GÓMEZ' },
      responsibleLawyer: { id: lawyerId },
      legalQualifications: [],
      active: true,
      currentState: { name: 'Iniciada', initial: true, proceduralStateId: null, dueDate: null },
      // Cargada con la factory, sin pasar por el alta: no tiene estado de carpeta.
      folder: null,
    });
  });

  it('una colección vacía trae totalPages en 1, no en 0', async () => {
    const res = await request(app.getHttpServer()).get(URL).set(actor);

    expect(expectPaginated(res, { totalItems: 0, totalPages: 1 })).toEqual([]);
  });

  describe('businessDaysRemaining', () => {
    it('es null cuando la causa no tiene vencimiento', async () => {
      await aCase();

      const res = await request(app.getHttpServer()).get(URL).set(actor);
      const [item] = expectPaginated<{ currentState: { businessDaysRemaining: number | null } }>(res);

      expect(item.currentState.businessDaysRemaining).toBeNull();
    });

    it('es positivo con un plazo por vencer y negativo con uno vencido', async () => {
      const futura = await aCase('FUTURA');
      const vencida = await aCase('VENCIDA');
      await withDeadline(futura.id, 14);
      await withDeadline(vencida.id, -14);

      const res = await request(app.getHttpServer()).get(URL).set(actor);
      const items = expectPaginated<{
        caption: string;
        currentState: { businessDaysRemaining: number; dueDate: string };
      }>(res);

      const porCaratula = new Map(items.map((item) => [item.caption, item]));
      expect(porCaratula.get('VENCIDA')!.currentState.businessDaysRemaining).toBeLessThan(0);
      expect(porCaratula.get('FUTURA')!.currentState.businessDaysRemaining).toBeGreaterThan(0);
      // Las fechas salen como YYYY-MM-DD, nunca con hora (§4).
      expect(porCaratula.get('FUTURA')!.currentState.dueDate).toMatch(/^\d{4}-\d{2}-\d{2}$/);
    });

    it('la vencida sale primera: el orden es por urgencia', async () => {
      const futura = await aCase('FUTURA');
      const vencida = await aCase('VENCIDA');
      const sinPlazo = await aCase('SIN PLAZO');
      await withDeadline(futura.id, 14);
      await withDeadline(vencida.id, -14);

      const res = await request(app.getHttpServer()).get(URL).set(actor);
      const items = expectPaginated<{ caption: string }>(res);

      expect(items.map((item) => item.caption)).toEqual(['VENCIDA', 'FUTURA', 'SIN PLAZO']);
      expect(sinPlazo.id).toBeDefined();
    });
  });

  describe('filtros', () => {
    it('busca por apellido del cliente (CA-20.2)', async () => {
      const otro = await createClient({ lastName: 'QUESADA', firstName: 'Marta' });
      await aCase('DE GOMEZ');
      await getPrisma().case.create({
        data: {
          caption: 'DE QUESADA',
          jurisdictionId: (await createInitialState('CRIMINAL')).jurisdictionId,
          proceduralRole: 'DEFENSA',
          clientId: otro.id,
          responsibleLawyerId: lawyerId,
          startDate: new Date('2021-03-12T00:00:00.000Z'),
          currentStateId: (await createInitialState('CRIMINAL')).stateId,
          createdByUserId: userId,
        },
      });

      const res = await request(app.getHttpServer()).get(URL).query({ search: 'quesada' }).set(actor);

      expect(expectPaginated<{ caption: string }>(res).map((i) => i.caption)).toEqual(['DE QUESADA']);
    });

    it('acepta el fuero en minúsculas', async () => {
      await aCase();

      const res = await request(app.getHttpServer()).get(URL).query({ jurisdiction: 'criminal' }).set(actor);

      expect(expectPaginated(res, { totalItems: 1 })).toHaveLength(1);
    });

    it('un abogado inexistente devuelve 200 con la colección vacía, no 404', async () => {
      await aCase();

      const res = await request(app.getHttpServer())
        .get(URL)
        .query({ responsibleLawyerId: 999999 })
        .set(actor);

      expect(expectPaginated(res, { totalItems: 0 })).toEqual([]);
    });
  });

  describe('errores', () => {
    it('rechaza los tres filtros de estado combinados con INVALID_REQUEST (CA-20.4)', async () => {
      const res = await request(app.getHttpServer())
        .get(URL)
        .query({ proceduralStateId: 1, customState: 'Con oposición' })
        .set(actor);

      expectError(res, 400, 'INVALID_REQUEST', ['customState']);
    });

    it('nombra withoutProceduralActs cuando es el que sobra', async () => {
      const res = await request(app.getHttpServer())
        .get(URL)
        .query({ withoutProceduralActs: true, proceduralStateId: 1 })
        .set(actor);

      expectError(res, 400, 'INVALID_REQUEST', ['withoutProceduralActs']);
    });

    // El código es propio: `INVALID_PAGINATION`, no el `VALIDATION_ERROR` genérico.
    it.each([
      ['page', { page: 0 }],
      ['limit', { limit: 500 }],
    ])('rechaza %s fuera de rango con INVALID_PAGINATION', async (_campo, query) => {
      const res = await request(app.getHttpServer()).get(URL).query(query).set(actor);

      expectError(res, 400, 'INVALID_PAGINATION', ['page', 'limit']);
    });

    it('rechaza un fuero inexistente', async () => {
      const res = await request(app.getHttpServer()).get(URL).query({ jurisdiction: 'PENAL' }).set(actor);

      expectError(res, 400, 'VALIDATION_ERROR', ['jurisdiction']);
    });

    it('rechaza un parámetro desconocido', async () => {
      const res = await request(app.getHttpServer()).get(URL).query({ ordenar: 'fecha' }).set(actor);

      expectError(res, 400, 'VALIDATION_ERROR', ['ordenar']);
    });

    it('responde 401 sin token', async () => {
      const res = await request(app.getHttpServer()).get(URL);

      expectError(res, 401, 'UNAUTHENTICATED');
    });
  });
});
