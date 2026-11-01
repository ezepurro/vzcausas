import { INestApplication } from '@nestjs/common';
import request from 'supertest';
import * as bcrypt from 'bcryptjs';

import { getPrisma, startTestApp, stopTestApp } from '../../shared/harness/test-app';
import { expectData, expectError, expectPaginated } from '../../shared/contract/envelopes';
import { loginAs, TestRole } from '../../shared/auth/login-as';
import { createCase, deactivateCase } from '../../shared/factories/case.factory';
import { createClient } from '../../shared/factories/client.factory';
import { createLawyer } from '../../shared/factories/lawyer.factory';
import { createProceduralState } from '../../shared/factories/procedural-state.factory';
import { createUser } from '../../shared/factories/user.factory';

/*
 * Consulta de abogados (`GET /lawyers` y `GET /lawyers/{lawyerId}`). Contrato:
 * API_CONTRACT_V5.md §3.3. El 401 sin token está en `test/smoke/app.int.spec.ts`.
 *
 * `POST /lawyers` no tiene test de integración: nunca lo tuvo, y esta suite junta lo
 * que ya existía de abogados (antes en `clients.int.spec.ts` y en `case-query.int.spec.ts`).
 */

const URL = '/api/v1/lawyers';

interface LawyerBody {
  id: number;
  lastName: string;
  firstName: string;
  registrationNumber: string;
  activeCases: number;
  active: boolean;
}

const PASSWORD = 'password1';
const ROLES: TestRole[] = ['ADMINISTRATOR', 'LAWYER', 'SECRETARY'];

const reader = () => loginAs({ permissions: ['lawyer:read'] });

let app: INestApplication;
const server = () => request(app.getHttpServer());

beforeAll(async () => {
  app = await startTestApp();
});

afterAll(async () => {
  await stopTestApp();
});

beforeEach(async () => {
  // Las causas y los usuarios referencian abogados con `Restrict`, así que van
  // primero, y antes que las causas sus hijas. La causa apunta a su acto vigente: ese
  // vínculo se suelta antes de borrar los actos.
  const prisma = getPrisma();
  await prisma.offense.deleteMany();
  await prisma.case.updateMany({ data: { currentProceduralActId: null } });
  await prisma.proceduralAct.deleteMany();
  await prisma.case.deleteMany();
  await prisma.client.deleteMany();
  await prisma.user.deleteMany();
  await prisma.lawyer.deleteMany();
});

describe('GET /api/v1/lawyers', () => {
  it('devuelve el sobre paginado con cada abogado en la forma del contrato, sin los dados de baja', async () => {
    const lawyer = await createLawyer({ lastName: 'Vázquez', firstName: 'Fernando G.', registrationNumber: '1-28114' });
    await createLawyer({ active: false });

    const data = expectPaginated<LawyerBody>(await server().get(URL).set(reader()), {
      page: 1,
      limit: 20,
      totalItems: 1,
      totalPages: 1,
    });

    expect(data).toEqual([
      {
        id: lawyer.id,
        lastName: 'Vázquez',
        firstName: 'Fernando G.',
        registrationNumber: '1-28114',
        activeCases: 0,
        active: true,
      },
    ]);
  });

  it('busca por apellido, nombres y matrícula, sin distinguir mayúsculas', async () => {
    const peralta = await createLawyer({ lastName: 'Peralta', firstName: 'Ignacio', registrationNumber: '1-35207' });
    await createLawyer({ lastName: 'Vázquez', firstName: 'Fernando G.', registrationNumber: '1-28114' });

    for (const search of ['peralta', 'IGNACIO', '35207']) {
      const data = expectPaginated<LawyerBody>(await server().get(URL).query({ search }).set(reader()));
      expect(data.map((l) => l.id)).toEqual([peralta.id]);
    }
  });
});

describe('GET /api/v1/lawyers/{lawyerId}', () => {
  const getById = (id: number | string) => server().get(`${URL}/${id}`).set(reader());

  it('devuelve el abogado en la forma del contrato, con activeCases', async () => {
    const lawyer = await createLawyer({ lastName: 'Peralta', firstName: 'Ignacio', registrationNumber: '1-35207' });

    expect(expectData<LawyerBody>(await getById(lawyer.id), 200)).toEqual({
      id: lawyer.id,
      lastName: 'Peralta',
      firstName: 'Ignacio',
      registrationNumber: '1-35207',
      activeCases: 0,
      active: true,
    });
  });

  /**
   * §3.3: dado de baja, "no existe forma de consultarlo".
   *
   * Desvío nombrado, sin fijar: el contrato pide `details: null` y hoy llega
   * `{ lawyerId }` (`people.errors.ts:40`). Por eso no se usa `expectError`, que lo
   * exige: se mira el status, el `code` y el `message` del contrato.
   */
  it('responde 404 para un abogado inexistente y para uno dado de baja', async () => {
    const deactivated = await createLawyer({ active: false });

    for (const id of [999999, deactivated.id]) {
      const res = await getById(id);
      expect(res.status).toBe(404);
      expect(res.body.error).toMatchObject({ code: 'LAWYER_NOT_FOUND', message: 'No se encontró el abogado solicitado.' });
    }
  });

  it('rechaza un identificador que no es un entero', async () => {
    expectError(await getById('abc'), 400, 'INVALID_PATH_PARAMETER', ['lawyerId']);
  });
});

/**
 * `activeCases` de abogados (§3.3). Lo cuenta `cases`, dueño de la definición de causa
 * activa (§4), y llega por el `ActiveCasesCounterPort` que declara `people` e implementa
 * `cases/infrastructure/acl/people-active-cases-counter.adapter.ts`.
 */
describe('activeCases de /api/v1/lawyers', () => {
  it('el listado y el detalle devuelven el conteo real de cada abogado, con 0 para uno sin causas', async () => {
    const client = await createClient();
    const user = await createUser();
    const conDos = await createLawyer();
    const sinCausas = await createLawyer();
    for (let i = 0; i < 2; i += 1) {
      await createCase({ clientId: client.id, responsibleLawyerId: conDos.id, createdByUserId: user.id });
    }

    const list = expectPaginated<LawyerBody>(await server().get(URL).set(reader()));
    const one = expectData<LawyerBody>(await server().get(`${URL}/${conDos.id}`).set(reader()), 200);

    expect(new Map(list.map((l) => [l.id, l.activeCases]))).toEqual(
      new Map([
        [conDos.id, 2],
        [sinCausas.id, 0],
      ]),
    );
    expect(one.activeCases).toBe(2);
  });

  /**
   * La asimetría del §4 que se ve desde este lado: la causa en el estado inicial
   * **sí** cuenta para su abogado (para el `activeCases` de un estado procesal no
   * contaría). La de estado escrito a mano también es activa: su `current_state_id`
   * es null, y un filtro sobre `currentState.terminal` la perdería.
   */
  it('cuenta la causa en el estado inicial y la de estado escrito a mano; no la terminal ni la dada de baja', async () => {
    const client = await createClient();
    const user = await createUser();
    const lawyer = await createLawyer();
    const owner = { clientId: client.id, responsibleLawyerId: lawyer.id, createdByUserId: user.id };
    // Sin fijarle el nombre: el seed ya tiene una "Archivada". Sólo importa que sea terminal.
    const terminal = await createProceduralState({ terminal: true });
    await createCase(owner);
    await createCase({ ...owner, currentCustomState: 'Con acusación, pero con oposición' });
    await createCase({ ...owner, currentStateId: terminal.stateId });
    const baja = await createCase(owner);
    await deactivateCase(baja.id);

    const one = await server().get(`${URL}/${lawyer.id}`).set(reader());

    expect(expectData<LawyerBody>(one, 200).activeCases).toBe(2);
  });
});

/**
 * Con login real: lo que se verifica es el **seed**. La lectura de abogados es de
 * cualquier autenticado; antes de HU-9 el seed dejaba a `LAWYER` sin permisos y el
 * endpoint le respondía 403, contra la matriz, sin que ningún test lo viera.
 */
describe('Permisos de /api/v1/lawyers', () => {
  it.each(ROLES)('un %s consulta el listado y el detalle', async (role) => {
    const lawyer = await createLawyer();
    const user = await createUser({ roles: [role], passwordHash: await bcrypt.hash(PASSWORD, 4) });
    const login = await server().post('/api/v1/auth/login').send({ username: user.username, password: PASSWORD });
    expect(login.status).toBe(200);
    const auth = { Authorization: `Bearer ${login.body.data.accessToken}` };

    expectPaginated(await server().get(URL).set(auth));
    expectData(await server().get(`${URL}/${lawyer.id}`).set(auth), 200);
  });
});
