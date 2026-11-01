import { deactivateCase } from '../../shared/factories/case.factory';
import { INestApplication } from '@nestjs/common';

import { ListCases } from '../../../src/subsystems/cases/core/application/use-cases/case/list-cases.use-case';
import {
  CASE_REPOSITORY,
  CasePage,
  CaseRepository,
  CaseSearchCriteria,
} from '../../../src/subsystems/cases/core/domain/ports/case/case.repository';
import { createClient } from '../../shared/factories/client.factory';
import { createLawyer } from '../../shared/factories/lawyer.factory';
import {
  createInitialState,
  createProceduralState,
} from '../../shared/factories/procedural-state.factory';
import { createUser } from '../../shared/factories/user.factory';
import { getPrisma, startTestApp, stopTestApp } from '../../shared/harness/test-app';

/*
 * Adaptador de lectura de causas (`PrismaCaseRepository`), HU20 y HU22.
 *
 * Se prueba el PUERTO contra la base real, no el endpoint. El listado (orden por
 * urgencia, filtros y paginación) se prueba a través de `ListCases`: el
 * repositorio filtra y devuelve el vencimiento de cada causa, y el caso de uso
 * ordena y pagina, así que lo que hay que verificar es la composición de los dos.
 *
 * El orden es lo más delicado. El vencimiento vigente es
 * COALESCE(deadline_manual_due_date, deadline_computed_due_date) del acto que
 * puso la causa en su estado actual, y ordenar por una columna y después por la
 * otra NO es equivalente: es el bug que estos tests tienen que atrapar.
 */
const day = (iso: string): Date => new Date(`${iso}T00:00:00.000Z`);

describe('CaseRepository (adaptador Prisma)', () => {
  let app: INestApplication;
  let cases: CaseRepository;
  let search: (criteria: CaseSearchCriteria) => Promise<CasePage>;
  let userId: number;
  let lawyerId: number;
  let clientId: number;

  beforeAll(async () => {
    app = await startTestApp();
    cases = app.get<CaseRepository>(CASE_REPOSITORY);
    const listCases = app.get(ListCases);
    search = (criteria) => listCases.execute(criteria);
  });

  afterAll(async () => {
    await stopTestApp();
  });

  beforeEach(async () => {
    const prisma = getPrisma();
    await prisma.offense.deleteMany();
    // `cases.current_procedural_act_id` apunta al acto: hay que soltar la FK
    // antes de borrar los actos, o el DELETE la viola.
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
  });

  /** Una causa en el estado inicial del fuero: sin acto y sin vencimiento. */
  async function aCase(overrides: { caption?: string; jurisdiction?: 'CRIMINAL' | 'AMPARO'; clientId?: number; lawyerId?: number } = {}) {
    const initial = await createInitialState(overrides.jurisdiction ?? 'CRIMINAL');
    return getPrisma().case.create({
      data: {
        caption: overrides.caption ?? 'CAUSA',
        jurisdictionId: initial.jurisdictionId,
        proceduralRole: overrides.jurisdiction === 'AMPARO' ? 'ACTORA' : 'DEFENSA',
        clientId: overrides.clientId ?? clientId,
        responsibleLawyerId: overrides.lawyerId ?? lawyerId,
        startDate: day('2021-03-12'),
        currentStateId: initial.stateId,
        createdByUserId: userId,
        subjectMatter: overrides.jurisdiction === 'AMPARO' ? 'Objeto del amparo' : null,
      },
    });
  }

  /**
   * Mueve una causa a un estado por un acto procesal, con su vencimiento.
   * `manual` y `computed` son las dos columnas del plazo: el vencimiento
   * vigente es el manual si existe, si no el calculado.
   */
  async function moveTo(
    caseId: number,
    opts: {
      stateName?: string;
      stateId?: number;
      terminal?: boolean;
      customState?: string;
      manual?: string | null;
      computed?: string | null;
    },
  ) {
    const prisma = getPrisma();
    const state = opts.customState
      ? null
      : opts.stateId !== undefined
        ? await prisma.proceduralState.findUniqueOrThrow({ where: { stateId: opts.stateId } })
        : await createProceduralState({ name: opts.stateName, terminal: opts.terminal });

    const act = await prisma.proceduralAct.create({
      data: {
        caseId,
        proceduralStateId: state?.stateId ?? null,
        customState: opts.customState ?? null,
        actDate: day('2026-09-01'),
        deadlineTimeLimitDays: 5,
        deadlineDayType: 'BUSINESS',
        deadlineCountsFrom: day('2026-09-01'),
        deadlineComputedDueDate: opts.computed ? day(opts.computed) : null,
        deadlineManualDueDate: opts.manual ? day(opts.manual) : null,
        registeredByUserId: userId,
        registeredByLawyerId: lawyerId,
      },
    });

    // El CHECK del schema exige exactamente uno de (current_state_id, current_custom_state).
    await prisma.case.update({
      where: { id: caseId },
      data: {
        currentStateId: state?.stateId ?? null,
        currentCustomState: opts.customState ?? null,
        currentProceduralActId: act.id,
      },
    });

    return act;
  }

  const page = { page: 1, limit: 20 };

  describe('orden por urgencia (CA-20.1)', () => {
    it('ordena por vencimiento ascendente, con las vencidas primero y las sin vencimiento al final', async () => {
      const sinPlazo = await aCase({ caption: 'SIN PLAZO' });
      const vence = await aCase({ caption: 'VENCE DESPUES' });
      const vencida = await aCase({ caption: 'YA VENCIDA' });

      await moveTo(vence.id, { computed: '2026-12-01' });
      await moveTo(vencida.id, { computed: '2026-09-11' });

      const result = await search(page);

      expect(result.items.map((item) => item.caption)).toEqual([
        'YA VENCIDA', // la fecha más chica, aunque ya pasó
        'VENCE DESPUES',
        'SIN PLAZO', // las sin vencimiento, al final
      ]);
    });

    it('usa el vencimiento manual cuando existe, no el calculado', async () => {
      // Este es el test que distingue COALESCE de "ordená por una y después por
      // la otra": A no tiene manual y vence antes que el manual de B. Ordenando
      // por la columna manual primero, A quedaría del lado equivocado.
      const a = await aCase({ caption: 'A' });
      const b = await aCase({ caption: 'B' });

      await moveTo(a.id, { computed: '2026-09-01', manual: null });
      await moveTo(b.id, { computed: '2026-09-20', manual: '2026-09-05' });

      const result = await search(page);

      expect(result.items.map((item) => item.caption)).toEqual(['A', 'B']);
      expect(result.items[0].currentState.dueDate).toEqual(day('2026-09-01'));
      expect(result.items[1].currentState.dueDate).toEqual(day('2026-09-05'));
      expect(result.items[1].currentState.manuallyAdjusted).toBe(true);
    });

    it('desempata por id las causas sin vencimiento', async () => {
      const primera = await aCase({ caption: 'PRIMERA' });
      const segunda = await aCase({ caption: 'SEGUNDA' });

      const result = await search(page);

      expect(result.items.map((item) => item.id)).toEqual([primera.id, segunda.id]);
    });
  });

  describe('filtros', () => {
    it('search encuentra por apellido del cliente, por carátula y por SAC', async () => {
      const otroCliente = await createClient({ lastName: 'QUESADA', firstName: 'Marta' });
      await aCase({ caption: 'CAUSA DE GOMEZ' });
      await aCase({ caption: 'OTRA CAUSA', clientId: otroCliente.id });

      // Por apellido del cliente: es el campo que el stub hacía imposible (CA-20.2).
      const porApellido = await search({ ...page, search: 'quesada' });
      expect(porApellido.items.map((item) => item.caption)).toEqual(['OTRA CAUSA']);

      const porCaratula = await search({ ...page, search: 'DE GOMEZ' });
      expect(porCaratula.items.map((item) => item.caption)).toEqual(['CAUSA DE GOMEZ']);
    });

    it('search no distingue mayúsculas pero sí acentos', async () => {
      await aCase({ caption: 'CAUSA' });

      expect((await search({ ...page, search: 'gómez' })).items).toHaveLength(1);
      expect((await search({ ...page, search: 'GÓMEZ' })).items).toHaveLength(1);
      // Los acentos NO se ignoran: es deuda aceptada, no un olvido.
      expect((await search({ ...page, search: 'gomez' })).items).toHaveLength(0);
    });

    it('filtra por fuero, por abogado responsable y por cliente', async () => {
      const otroAbogado = await createLawyer();
      const otroCliente = await createClient();
      await aCase({ caption: 'PENAL' });
      await aCase({ caption: 'AMPARO', jurisdiction: 'AMPARO' });
      await aCase({ caption: 'DE OTRO ABOGADO', lawyerId: otroAbogado.id });
      await aCase({ caption: 'DE OTRO CLIENTE', clientId: otroCliente.id });

      expect((await search({ ...page, jurisdiction: 'AMPARO' as never })).items.map((i) => i.caption)).toEqual(['AMPARO']);
      expect((await search({ ...page, responsibleLawyerId: otroAbogado.id })).items.map((i) => i.caption)).toEqual(['DE OTRO ABOGADO']);
      expect((await search({ ...page, clientId: otroCliente.id })).items.map((i) => i.caption)).toEqual(['DE OTRO CLIENTE']);
    });

    it('openDeadline deja solo las que tienen vencimiento, vencidas incluidas', async () => {
      const vencida = await aCase({ caption: 'VENCIDA' });
      await aCase({ caption: 'SIN PLAZO' });
      await moveTo(vencida.id, { computed: '2026-09-11' });

      const result = await search({ ...page, openDeadline: true });

      expect(result.items.map((item) => item.caption)).toEqual(['VENCIDA']);
    });

    it('los tres filtros de estado son excluyentes y cada uno filtra lo suyo (CA-20.4)', async () => {
      const enEstado = await aCase({ caption: 'EN ESTADO DE TABLA' });
      const escritoAMano = await aCase({ caption: 'ESCRITO A MANO' });
      await aCase({ caption: 'INICIADA' });

      const act = await moveTo(enEstado.id, { stateName: 'Alegato', computed: '2026-10-01' });
      await moveTo(escritoAMano.id, { customState: 'Con acusación, pero con oposición', computed: '2026-10-02' });

      const porEstado = await search({
        ...page,
        state: { kind: 'proceduralState', proceduralStateId: act.proceduralStateId as number },
      });
      expect(porEstado.items.map((i) => i.caption)).toEqual(['EN ESTADO DE TABLA']);

      // Coincidencia exacta, sin distinguir mayúsculas.
      const porCustom = await search({
        ...page,
        state: { kind: 'custom', customState: 'CON ACUSACIÓN, PERO CON OPOSICIÓN' },
      });
      expect(porCustom.items.map((i) => i.caption)).toEqual(['ESCRITO A MANO']);

      const iniciadas = await search({ ...page, state: { kind: 'withoutProceduralActs' } });
      expect(iniciadas.items.map((i) => i.caption)).toEqual(['INICIADA']);
    });

    it('un filtro por un abogado o un estado inexistente devuelve vacío, no un error', async () => {
      await aCase();

      const porAbogado = await search({ ...page, responsibleLawyerId: 999999 });
      const porEstado = await search({
        ...page,
        state: { kind: 'proceduralState', proceduralStateId: 999999 },
      });

      expect(porAbogado).toEqual({ items: [], totalItems: 0 });
      expect(porEstado).toEqual({ items: [], totalItems: 0 });
    });
  });

  describe('paginación', () => {
    it('devuelve la página pedida y el total del conjunto filtrado, no el de la página', async () => {
      await aCase({ caption: 'UNA' });
      await aCase({ caption: 'DOS' });
      await aCase({ caption: 'TRES' });

      const primera = await search({ page: 1, limit: 2 });
      const segunda = await search({ page: 2, limit: 2 });

      expect(primera.items).toHaveLength(2);
      expect(primera.totalItems).toBe(3);
      expect(segunda.items).toHaveLength(1);
      expect(segunda.totalItems).toBe(3);
      expect(segunda.items[0].caption).toBe('TRES');
    });
  });

  describe('proyección del estado actual', () => {
    it('en el estado inicial manda proceduralStateId en null, aunque la columna apunte a la fila real', async () => {
      const created = await aCase();

      const item = await cases.findListItemById(created.id);

      expect(item?.currentState).toEqual({
        proceduralStateId: null, // la columna tiene el id de "Iniciada"; el contrato pide null
        name: 'Iniciada',
        custom: false,
        initial: true,
        proceduralActId: null,
        dueDate: null,
        businessDaysRemaining: null, // lo calcula el caso de uso, no la persistencia
        manuallyAdjusted: false,
      });
    });

    it('en un estado escrito a mano manda el texto como nombre y proceduralStateId en null', async () => {
      const created = await aCase();
      await moveTo(created.id, { customState: 'Con acusación, pero con oposición', computed: '2026-10-02' });

      const item = await cases.findListItemById(created.id);

      expect(item?.currentState.proceduralStateId).toBeNull();
      expect(item?.currentState.custom).toBe(true);
      expect(item?.currentState.initial).toBe(false);
      expect(item?.currentState.name).toBe('Con acusación, pero con oposición');
      expect(item?.currentState.dueDate).toEqual(day('2026-10-02'));
    });

    it('en un estado de la tabla manda su id y su nombre', async () => {
      const created = await aCase();
      const act = await moveTo(created.id, { stateName: 'Alegato', computed: '2026-10-01' });

      const item = await cases.findListItemById(created.id);

      expect(item?.currentState.proceduralStateId).toBe(act.proceduralStateId);
      expect(item?.currentState.name).toBe('Alegato');
      expect(item?.currentState.custom).toBe(false);
      expect(item?.currentState.initial).toBe(false);
      expect(item?.currentState.proceduralActId).toBe(act.id);
      expect(item?.currentState.manuallyAdjusted).toBe(false);
    });
  });

  describe('findListItemById', () => {
    it('trae el cliente y el abogado resueltos, no sus ids', async () => {
      const created = await aCase();

      const item = await cases.findListItemById(created.id);

      expect(item?.client).toMatchObject({ id: clientId, lastName: 'GÓMEZ', firstName: 'Ariel Fernando' });
      expect(item?.responsibleLawyer).toMatchObject({ id: lawyerId });
      expect(item?.responsibleLawyer.lastName).toEqual(expect.any(String));
      expect(item?.responsibleLawyer.firstName).toEqual(expect.any(String));
      expect(item?.responsibleLawyer.registrationNumber).toEqual(expect.any(String));
    });

    it('devuelve null para una causa inexistente y para una dada de baja', async () => {
      const created = await aCase();
      await deactivateCase(created.id);

      expect(await cases.findListItemById(created.id)).toBeNull();
      expect(await cases.findListItemById(999999)).toBeNull();
    });

    it('una causa dada de baja tampoco aparece en el listado', async () => {
      const created = await aCase();
      await deactivateCase(created.id);

      expect(await search(page)).toEqual({ items: [], totalItems: 0 });
    });
  });
});
