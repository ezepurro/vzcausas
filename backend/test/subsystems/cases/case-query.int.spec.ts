import { INestApplication } from '@nestjs/common';

import {
  CASE_QUERY,
  CaseQueryPort,
} from '../../../src/subsystems/cases/core/domain/ports/case-query.port';
import { createClient } from '../../shared/factories/client.factory';
import { createLawyer } from '../../shared/factories/lawyer.factory';
import { createLegalQualification } from '../../shared/factories/legal-qualification.factory';
import {
  createInitialState,
  createProceduralState,
} from '../../shared/factories/procedural-state.factory';
import { createUser } from '../../shared/factories/user.factory';
import { getPrisma, startTestApp, stopTestApp } from '../../shared/harness/test-app';

/*
 * Adaptador de lectura de causas (`CaseQueryPrismaAdapter`), HU20 y HU22.
 *
 * Se prueba el PUERTO, no el endpoint: el caso de uso y el controller todavía no
 * existen. Lo que importa verificar acá es lo único que `tsc` no puede mirar —
 * el SQL escrito a mano: los nombres de columna, el orden por urgencia y los
 * ocho filtros.
 *
 * El orden es lo más delicado. El vencimiento vigente es
 * COALESCE(deadline_manual_due_date, deadline_computed_due_date) del acto que
 * puso la causa en su estado actual, y ordenar por una columna y después por la
 * otra NO es equivalente: es el bug que estos tests tienen que atrapar.
 */
const day = (iso: string): Date => new Date(`${iso}T00:00:00.000Z`);

describe('CaseQueryPort (adaptador Prisma)', () => {
  let app: INestApplication;
  let cases: CaseQueryPort;
  let userId: number;
  let lawyerId: number;
  let clientId: number;

  beforeAll(async () => {
    app = await startTestApp();
    cases = app.get<CaseQueryPort>(CASE_QUERY);
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
   *
   * `stateId` reusa un estado que ya existe, en vez de crear uno: los conteos
   * necesitan varias causas en el MISMO estado, y sin esto cada llamada
   * creaba uno nuevo y todos los conteos daban 1.
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

  /**
   * Cuelga calificaciones legales de una causa. `prescriptionDate` la calcula
   * Registrar Causa al alta; para los conteos no importa su valor, importa
   * que la fila de `offenses` exista.
   */
  async function withQualifications(caseId: number, qualificationIds: number[]) {
    await getPrisma().offense.createMany({
      data: qualificationIds.map((legalQualificationId) => ({
        caseId,
        legalQualificationId,
        offenseDate: day('2021-03-12'),
        prescriptionDate: day('2029-03-12'),
      })),
    });
  }

  const page = { page: 1, limit: 20 };

  describe('orden por urgencia (CA-20.1)', () => {
    it('ordena por vencimiento ascendente, con las vencidas primero y las sin vencimiento al final', async () => {
      const sinPlazo = await aCase({ caption: 'SIN PLAZO' });
      const vence = await aCase({ caption: 'VENCE DESPUES' });
      const vencida = await aCase({ caption: 'YA VENCIDA' });

      await moveTo(vence.id, { computed: '2026-12-01' });
      await moveTo(vencida.id, { computed: '2026-09-11' });

      const result = await cases.search(page);

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

      const result = await cases.search(page);

      expect(result.items.map((item) => item.caption)).toEqual(['A', 'B']);
      expect(result.items[0].currentState.dueDate).toEqual(day('2026-09-01'));
      expect(result.items[1].currentState.dueDate).toEqual(day('2026-09-05'));
      expect(result.items[1].currentState.manuallyAdjusted).toBe(true);
    });

    it('desempata por id las causas sin vencimiento', async () => {
      const primera = await aCase({ caption: 'PRIMERA' });
      const segunda = await aCase({ caption: 'SEGUNDA' });

      const result = await cases.search(page);

      expect(result.items.map((item) => item.id)).toEqual([primera.id, segunda.id]);
    });
  });

  describe('filtros', () => {
    it('search encuentra por apellido del cliente, por carátula y por SAC', async () => {
      const otroCliente = await createClient({ lastName: 'QUESADA', firstName: 'Marta' });
      await aCase({ caption: 'CAUSA DE GOMEZ' });
      await aCase({ caption: 'OTRA CAUSA', clientId: otroCliente.id });

      // Por apellido del cliente: es el campo que el stub hacía imposible (CA-20.2).
      const porApellido = await cases.search({ ...page, search: 'quesada' });
      expect(porApellido.items.map((item) => item.caption)).toEqual(['OTRA CAUSA']);

      const porCaratula = await cases.search({ ...page, search: 'DE GOMEZ' });
      expect(porCaratula.items.map((item) => item.caption)).toEqual(['CAUSA DE GOMEZ']);
    });

    it('search no distingue mayúsculas pero sí acentos', async () => {
      await aCase({ caption: 'CAUSA' });

      expect((await cases.search({ ...page, search: 'gómez' })).items).toHaveLength(1);
      expect((await cases.search({ ...page, search: 'GÓMEZ' })).items).toHaveLength(1);
      // Los acentos NO se ignoran: es deuda aceptada, no un olvido.
      expect((await cases.search({ ...page, search: 'gomez' })).items).toHaveLength(0);
    });

    it('filtra por fuero, por abogado responsable y por cliente', async () => {
      const otroAbogado = await createLawyer();
      const otroCliente = await createClient();
      await aCase({ caption: 'PENAL' });
      await aCase({ caption: 'AMPARO', jurisdiction: 'AMPARO' });
      await aCase({ caption: 'DE OTRO ABOGADO', lawyerId: otroAbogado.id });
      await aCase({ caption: 'DE OTRO CLIENTE', clientId: otroCliente.id });

      expect((await cases.search({ ...page, jurisdiction: 'AMPARO' as never })).items.map((i) => i.caption)).toEqual(['AMPARO']);
      expect((await cases.search({ ...page, responsibleLawyerId: otroAbogado.id })).items.map((i) => i.caption)).toEqual(['DE OTRO ABOGADO']);
      expect((await cases.search({ ...page, clientId: otroCliente.id })).items.map((i) => i.caption)).toEqual(['DE OTRO CLIENTE']);
    });

    it('openDeadline deja solo las que tienen vencimiento, vencidas incluidas', async () => {
      const vencida = await aCase({ caption: 'VENCIDA' });
      await aCase({ caption: 'SIN PLAZO' });
      await moveTo(vencida.id, { computed: '2026-09-11' });

      const result = await cases.search({ ...page, openDeadline: true });

      expect(result.items.map((item) => item.caption)).toEqual(['VENCIDA']);
    });

    it('los tres filtros de estado son excluyentes y cada uno filtra lo suyo (CA-20.4)', async () => {
      const enEstado = await aCase({ caption: 'EN ESTADO DE TABLA' });
      const escritoAMano = await aCase({ caption: 'ESCRITO A MANO' });
      await aCase({ caption: 'INICIADA' });

      const act = await moveTo(enEstado.id, { stateName: 'Alegato', computed: '2026-10-01' });
      await moveTo(escritoAMano.id, { customState: 'Con acusación, pero con oposición', computed: '2026-10-02' });

      const porEstado = await cases.search({
        ...page,
        state: { kind: 'proceduralState', proceduralStateId: act.proceduralStateId as number },
      });
      expect(porEstado.items.map((i) => i.caption)).toEqual(['EN ESTADO DE TABLA']);

      // Coincidencia exacta, sin distinguir mayúsculas.
      const porCustom = await cases.search({
        ...page,
        state: { kind: 'custom', customState: 'CON ACUSACIÓN, PERO CON OPOSICIÓN' },
      });
      expect(porCustom.items.map((i) => i.caption)).toEqual(['ESCRITO A MANO']);

      const iniciadas = await cases.search({ ...page, state: { kind: 'withoutProceduralActs' } });
      expect(iniciadas.items.map((i) => i.caption)).toEqual(['INICIADA']);
    });

    it('un filtro por un abogado o un estado inexistente devuelve vacío, no un error', async () => {
      await aCase();

      const porAbogado = await cases.search({ ...page, responsibleLawyerId: 999999 });
      const porEstado = await cases.search({
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

      const primera = await cases.search({ page: 1, limit: 2 });
      const segunda = await cases.search({ page: 2, limit: 2 });

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

      const item = await cases.findById(created.id);

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

      const item = await cases.findById(created.id);

      expect(item?.currentState.proceduralStateId).toBeNull();
      expect(item?.currentState.custom).toBe(true);
      expect(item?.currentState.initial).toBe(false);
      expect(item?.currentState.name).toBe('Con acusación, pero con oposición');
      expect(item?.currentState.dueDate).toEqual(day('2026-10-02'));
    });

    it('en un estado de la tabla manda su id y su nombre', async () => {
      const created = await aCase();
      const act = await moveTo(created.id, { stateName: 'Alegato', computed: '2026-10-01' });

      const item = await cases.findById(created.id);

      expect(item?.currentState.proceduralStateId).toBe(act.proceduralStateId);
      expect(item?.currentState.name).toBe('Alegato');
      expect(item?.currentState.custom).toBe(false);
      expect(item?.currentState.initial).toBe(false);
      expect(item?.currentState.proceduralActId).toBe(act.id);
      expect(item?.currentState.manuallyAdjusted).toBe(false);
    });
  });

  describe('findById', () => {
    it('trae el cliente y el abogado resueltos, no sus ids', async () => {
      const created = await aCase();

      const item = await cases.findById(created.id);

      expect(item?.client).toMatchObject({ id: clientId, lastName: 'GÓMEZ', firstName: 'Ariel Fernando' });
      expect(item?.responsibleLawyer).toMatchObject({ id: lawyerId });
      expect(item?.responsibleLawyer.fullName).toEqual(expect.any(String));
      expect(item?.responsibleLawyer.registrationNumber).toEqual(expect.any(String));
    });

    it('devuelve null para una causa inexistente y para una dada de baja', async () => {
      const created = await aCase();
      await getPrisma().case.update({ where: { id: created.id }, data: { active: false } });

      expect(await cases.findById(created.id)).toBeNull();
      expect(await cases.findById(999999)).toBeNull();
    });

    it('una causa dada de baja tampoco aparece en el listado', async () => {
      const created = await aCase();
      await getPrisma().case.update({ where: { id: created.id }, data: { active: false } });

      expect(await cases.search(page)).toEqual({ items: [], totalItems: 0 });
    });
  });

  /*
   * Los cuatro conteos de causas activas (contrato §8.4). La regla de qué es
   * una causa activa vive acá, en `cases` (§4), y los otros subsistemas la
   * consumen por un puerto: si cada uno contara por su cuenta, la regla
   * quedaría duplicada en cuatro lugares.
   *
   * Lo que estos tests tienen que atrapar es que **el predicado no es el mismo
   * para los cuatro**: el conteo por estado procesal excluye el estado
   * inicial, y los otros tres NO. Es la corrección que el pedido original no
   * tenía.
   */
  describe('countActiveByProceduralState', () => {
    it('cuenta las causas de cada estado y devuelve 0 para un estado pedido sin causas', async () => {
      const alegato = await createProceduralState();
      const clausura = await createProceduralState();
      const unaDeAlegato = await aCase();
      const otraDeAlegato = await aCase();
      const deClausura = await aCase();
      await moveTo(unaDeAlegato.id, { stateId: alegato.stateId });
      await moveTo(otraDeAlegato.id, { stateId: alegato.stateId });
      await moveTo(deClausura.id, { stateId: clausura.stateId });

      const counts = await cases.countActiveByProceduralState([alegato.stateId, clausura.stateId, 999999]);

      expect(counts.get(alegato.stateId)).toBe(2);
      expect(counts.get(clausura.stateId)).toBe(1);
      // Un estado inexistente no es un error: viene con 0, como cualquier otro.
      expect(counts.get(999999)).toBe(0);
      // Ni un id de más: el puerto promete exactamente los pedidos.
      expect(counts.size).toBe(3);
    });

    it('el estado inicial devuelve 0, aunque todas las causas nazcan en él', async () => {
      // §4: "Iniciada" no forma parte de `GET /procedural-states`, así que un
      // `activeCases` suyo no tiene dónde mostrarse. Este es el único de los
      // cuatro conteos que excluye el estado inicial.
      const inicial = await createInitialState('CRIMINAL');
      await aCase();
      await aCase();

      const counts = await cases.countActiveByProceduralState([inicial.stateId]);

      expect(counts.get(inicial.stateId)).toBe(0);
    });

    it('un estado terminal devuelve 0, aunque tenga causas', async () => {
      const archivada = await createProceduralState({ name: 'Archivada', terminal: true });
      const kase = await aCase();
      await moveTo(kase.id, { stateId: archivada.stateId });

      const counts = await cases.countActiveByProceduralState([archivada.stateId]);

      expect(counts.get(archivada.stateId)).toBe(0);
    });

    it('no cuenta las causas dadas de baja', async () => {
      const alegato = await createProceduralState();
      const activa = await aCase();
      const baja = await aCase();
      await moveTo(activa.id, { stateId: alegato.stateId });
      await moveTo(baja.id, { stateId: alegato.stateId });
      await getPrisma().case.update({ where: { id: baja.id }, data: { active: false } });

      const counts = await cases.countActiveByProceduralState([alegato.stateId]);

      expect(counts.get(alegato.stateId)).toBe(1);
    });

    it('una causa con estado escrito a mano no suma a ningún estado de la tabla', async () => {
      // No tiene `current_state_id`: no pertenece a ninguna fila de
      // `procedural_states`. Sigue siendo activa para los otros tres conteos.
      const alegato = await createProceduralState();
      const aMano = await aCase();
      await moveTo(aMano.id, { customState: 'Con acusación, pero con oposición' });

      const counts = await cases.countActiveByProceduralState([alegato.stateId]);

      expect(counts.get(alegato.stateId)).toBe(0);
    });

    it('cuenta las causas de un estado aunque se lo haya renombrado', async () => {
      // Agrupa por el id, no por el nombre: la causa referencia la fila por FK.
      const alegato = await createProceduralState();
      const kase = await aCase();
      await moveTo(kase.id, { stateId: alegato.stateId });
      await getPrisma().proceduralState.update({
        where: { stateId: alegato.stateId },
        data: { name: 'Alegato, renombrado después' },
      });

      const counts = await cases.countActiveByProceduralState([alegato.stateId]);

      expect(counts.get(alegato.stateId)).toBe(1);
    });

    it('una lista vacía de ids devuelve un Map vacío, sin consultar', async () => {
      await aCase();

      expect((await cases.countActiveByProceduralState([])).size).toBe(0);
    });
  });

  describe('countActiveByResponsibleLawyer', () => {
    it('cuenta las causas de cada abogado y devuelve 0 para uno pedido sin causas', async () => {
      const otroAbogado = await createLawyer();
      await aCase();
      await aCase();
      await aCase({ lawyerId: otroAbogado.id });

      const counts = await cases.countActiveByResponsibleLawyer([lawyerId, otroAbogado.id, 999999]);

      expect(counts.get(lawyerId)).toBe(2);
      expect(counts.get(otroAbogado.id)).toBe(1);
      expect(counts.get(999999)).toBe(0);
      expect(counts.size).toBe(3);
    });

    it('la causa en el estado inicial cuenta para su abogado, aunque no cuente para su estado', async () => {
      // Las dos mitades de la asimetría del §4, en un solo test. Si el conteo
      // por abogado arrastra el `is_initial = false` del conteo por estado,
      // esconde justo las causas que un estudio nuevo tiene casi todas.
      const inicial = await createInitialState('CRIMINAL');
      await aCase();

      expect((await cases.countActiveByProceduralState([inicial.stateId])).get(inicial.stateId)).toBe(0);
      expect((await cases.countActiveByResponsibleLawyer([lawyerId])).get(lawyerId)).toBe(1);
    });

    it('cuenta la de estado escrito a mano, y no la terminal ni la dada de baja', async () => {
      // El estado escrito a mano es el que más fácil se pierde: la causa tiene
      // `current_state_id` en null, así que un filtro de relación sobre
      // `currentState.terminal` no la matchea y desaparece del conteo. Es
      // activa: un estado escrito a mano no es terminal (§4).
      const aMano = await aCase();
      const archivada = await aCase();
      const baja = await aCase();
      await moveTo(aMano.id, { customState: 'Con acusación, pero con oposición' });
      await moveTo(archivada.id, { stateName: 'Archivada', terminal: true });
      await moveTo(baja.id, { stateName: 'Alegato' });
      await getPrisma().case.update({ where: { id: baja.id }, data: { active: false } });

      const counts = await cases.countActiveByResponsibleLawyer([lawyerId]);

      expect(counts.get(lawyerId)).toBe(1);
    });
  });

  describe('countActiveByClient', () => {
    it('cuenta las causas de cada cliente, sin las terminales, y devuelve 0 para uno sin causas', async () => {
      const otroCliente = await createClient();
      await aCase();
      await aCase();
      await aCase({ clientId: otroCliente.id });
      const archivada = await aCase();
      await moveTo(archivada.id, { stateName: 'Archivada', terminal: true });

      const counts = await cases.countActiveByClient([clientId, otroCliente.id, 999999]);

      // Tres causas del cliente por defecto, una archivada: quedan dos.
      expect(counts.get(clientId)).toBe(2);
      expect(counts.get(otroCliente.id)).toBe(1);
      expect(counts.get(999999)).toBe(0);
      expect(counts.size).toBe(3);
    });

    it('cuenta la de estado escrito a mano y no la dada de baja', async () => {
      const aMano = await aCase();
      const baja = await aCase();
      await moveTo(aMano.id, { customState: 'Con acusación, pero con oposición' });
      await getPrisma().case.update({ where: { id: baja.id }, data: { active: false } });

      const counts = await cases.countActiveByClient([clientId]);

      expect(counts.get(clientId)).toBe(1);
    });
  });

  describe('countActiveByLegalQualification', () => {
    it('una causa suma a cada una de sus calificaciones, y una sin causas devuelve 0', async () => {
      const robo = await createLegalQualification();
      const lesiones = await createLegalQualification();
      const sinCausas = await createLegalQualification();
      const conDos = await aCase();
      const conUna = await aCase();
      await withQualifications(conDos.id, [robo.id, lesiones.id]);
      await withQualifications(conUna.id, [robo.id]);

      const counts = await cases.countActiveByLegalQualification([robo.id, lesiones.id, sinCausas.id]);

      expect(counts.get(robo.id)).toBe(2);
      expect(counts.get(lesiones.id)).toBe(1);
      expect(counts.get(sinCausas.id)).toBe(0);
      expect(counts.size).toBe(3);
    });

    it('una calificación dada de baja sigue contando sus causas (RN12)', async () => {
      // El `active` de la calificación no filtra nada acá: la causa la sigue
      // mostrando porque forma parte de su historia. Lo que no se puede es
      // elegirla para una causa nueva.
      const derogada = await createLegalQualification({ active: false });
      const kase = await aCase();
      await withQualifications(kase.id, [derogada.id]);

      const counts = await cases.countActiveByLegalQualification([derogada.id]);

      expect(counts.get(derogada.id)).toBe(1);
    });

    it('cuenta la de estado escrito a mano, y no la terminal ni la dada de baja', async () => {
      const qualification = await createLegalQualification();
      const aMano = await aCase();
      const archivada = await aCase();
      const baja = await aCase();
      await withQualifications(aMano.id, [qualification.id]);
      await withQualifications(archivada.id, [qualification.id]);
      await withQualifications(baja.id, [qualification.id]);
      await moveTo(aMano.id, { customState: 'Con acusación, pero con oposición' });
      await moveTo(archivada.id, { stateName: 'Archivada', terminal: true });
      await getPrisma().case.update({ where: { id: baja.id }, data: { active: false } });

      const counts = await cases.countActiveByLegalQualification([qualification.id]);

      expect(counts.get(qualification.id)).toBe(1);
    });
  });
});
