import { INestApplication } from '@nestjs/common';
import request from 'supertest';
import * as bcrypt from 'bcryptjs';

import { TestRole } from '../../shared/auth/login-as';
import { expectData, expectError, expectPaginated } from '../../shared/contract/envelopes';
import { createCase, deactivateCase } from '../../shared/factories/case.factory';
import { createClient } from '../../shared/factories/client.factory';
import { createLawyer } from '../../shared/factories/lawyer.factory';
import { createLegalQualification } from '../../shared/factories/legal-qualification.factory';
import { createProceduralAct } from '../../shared/factories/procedural-act.factory';
import { createProceduralState } from '../../shared/factories/procedural-state.factory';
import {
  ProceduralActScenario,
  resetProceduralActData,
  setUpProceduralActScenario,
} from '../../shared/factories/procedural-act-scenario';
import { createUser } from '../../shared/factories/user.factory';
import { civil, withFixedClock } from '../../shared/harness/fixed-clock';
import { getPrisma, startTestApp, stopTestApp } from '../../shared/harness/test-app';

/*
 * Lectura de causas: HU20 (`GET /cases`, `GET /cases/custom-states`), HU22
 * (`GET /cases/{caseId}`) y HU27 (`GET /cases/{caseId}/timeline`). Contrato:
 * `API_CONTRACT_V5.md` §3.7. Una sola app, con reloj fijo: hoy es el martes 6/10/2026
 * (`fixed-clock.ts`), así que `businessDaysRemaining` y el orden no dependen del día
 * en que se corre la suite.
 *
 * El orden por urgencia se prueba acá, por HTTP, y no contra el repositorio: el
 * vencimiento vigente es COALESCE(manual, calculado) del acto que puso la causa en
 * su estado actual, y ordenar por una columna y después por la otra NO es lo mismo.
 * El test de orden arma el caso que distingue las dos cosas.
 *
 * El 401 sin token está en `test/smoke/app.int.spec.ts`. El cálculo de la
 * prescripción, en `prescription.spec.ts`; acá, que llega al recurso.
 */

type Item = Record<string, any>;

/** Las 30 claves del recurso causa (§3.7), iguales en el listado y en el detalle. */
const CASE_KEYS = [
  'active',
  'administrativeRemedyExhaustedOn',
  'caption',
  'client',
  'clientDetained',
  'counterparty',
  'court',
  'courtFeePaid',
  'currentState',
  'folder',
  'harmfulActDate',
  'harmfulActDeadline',
  'harmfulActRenewalDays',
  'harmfulActRenews',
  'harmfulActTermDayType',
  'harmfulActTermDays',
  'id',
  'injunctionGranted',
  'instructorExtension',
  'instructorName',
  'jurisdiction',
  'legalQualifications',
  'prescription',
  'prescriptionDeclaration',
  'proceduralRole',
  'responsibleLawyer',
  'sacNumber',
  'startDate',
  'subjectMatter',
  'tribunalPhone',
].sort();

const URL = '/api/v1/cases';

let app: INestApplication;
let s: ProceduralActScenario;

const server = () => request(app.getHttpServer());
/** Cualquier perfil lee todo (RN11): se lee como un abogado que no es el responsable. */
const get = (path: string, query: Record<string, unknown> = {}) => server().get(path).query(query).set(s.notResponsible);
const list = (query: Record<string, unknown> = {}) => get(URL, query);
const detail = async (caseId: number) => expectData<Item>(await get(`${URL}/${caseId}`), 200);

const owner = () => ({ clientId: s.client.id, responsibleLawyerId: s.lawyer.id, createdByUserId: s.user.id });

/**
 * Lleva la causa a un estado por un acto procesal con su vencimiento, como lo deja el
 * registro del acto. `computed` y `manual` son las dos columnas del plazo.
 */
async function moveTo(
  caseId: number,
  opts: { stateId?: number; customState?: string; computed?: string; manual?: string; actDate?: string },
) {
  const prisma = getPrisma();
  const actDate = civil(opts.actDate ?? '2026-09-01');
  const act = await prisma.proceduralAct.create({
    data: {
      caseId,
      proceduralStateId: opts.customState ? null : (opts.stateId ?? s.states.fiveBusinessDays.stateId),
      customState: opts.customState ?? null,
      actDate,
      deadlineTimeLimitDays: 5,
      deadlineDayType: 'BUSINESS',
      deadlineCountsFrom: actDate,
      deadlineComputedDueDate: opts.computed ? civil(opts.computed) : null,
      deadlineManualDueDate: opts.manual ? civil(opts.manual) : null,
      registeredByUserId: s.user.id,
      registeredByLawyerId: s.lawyer.id,
    },
  });
  // El CHECK de la base exige exactamente uno de (current_state_id, current_custom_state).
  await prisma.case.update({
    where: { id: caseId },
    data: {
      currentStateId: act.proceduralStateId,
      currentCustomState: act.customState,
      currentProceduralActId: act.id,
    },
  });
  return act;
}

beforeAll(async () => {
  app = await startTestApp(withFixedClock);
});

afterAll(async () => {
  await resetProceduralActData();
  await getPrisma().legalQualification.deleteMany({ where: { name: { startsWith: 'HU22 calificación' } } });
  await stopTestApp();
});

beforeEach(async () => {
  s = await setUpProceduralActScenario();
});

describe('GET /api/v1/cases (HU20)', () => {
  // El escenario trae una causa; el listado se arma desde cero en cada test.
  beforeEach(async () => {
    await getPrisma().case.delete({ where: { id: s.caseRow.id } });
  });

  const captions = (items: Item[]) => items.map((item) => item.caption);

  it('devuelve el sobre paginado con el recurso en la forma del contrato', async () => {
    await createCase({ ...owner(), caption: 'GÓMEZ, Ariel Fernando p.s.a. Robo calificado' });

    const [item] = expectPaginated<Item>(await list(), { page: 1, limit: 20, totalItems: 1, totalPages: 1 });

    expect(Object.keys(item).sort()).toEqual(CASE_KEYS);
    expect(item).toMatchObject({
      sacNumber: null, // una causa sin SAC es válida (D-33)
      jurisdiction: 'CRIMINAL',
      client: { id: s.client.id },
      responsibleLawyer: { id: s.lawyer.id },
      legalQualifications: [],
      // Una penal sin calificaciones no computa prescripción (D-74), y nadie la marcó como prescripta.
      prescription: null,
      prescriptionDeclaration: null,
      active: true,
      currentState: { name: 'Iniciada', initial: true, proceduralStateId: null, dueDate: null },
      // Cargada con la factory, sin pasar por el alta: no tiene estado de carpeta.
      folder: null,
    });
  });

  // CA-20.1, CA-20.5
  it('ordena por urgencia: el vencimiento vigente (el manual si lo hay) ascendente, y las sin vencimiento al final por id', async () => {
    const sinPlazo1 = await createCase({ ...owner(), caption: 'SIN PLAZO 1' });
    const sinPlazo2 = await createCase({ ...owner(), caption: 'SIN PLAZO 2' });
    const despues = await createCase({ ...owner(), caption: 'VENCE DESPUÉS' });
    const manual = await createCase({ ...owner(), caption: 'MANUAL' });
    const vencida = await createCase({ ...owner(), caption: 'VENCIDA' });
    await moveTo(despues.id, { computed: '2026-12-01' });
    // El que distingue COALESCE de "por una columna y después por la otra": el manual
    // de MANUAL (05/09) vence después que el calculado de VENCIDA (01/09), aunque su
    // calculado (20/09) sea todavía más tarde.
    await moveTo(manual.id, { computed: '2026-09-20', manual: '2026-09-05' });
    await moveTo(vencida.id, { computed: '2026-09-01' });

    const items = expectPaginated<Item>(await list());

    expect(captions(items)).toEqual(['VENCIDA', 'MANUAL', 'VENCE DESPUÉS', 'SIN PLAZO 1', 'SIN PLAZO 2']);
    expect(items.slice(3).map((item) => item.id)).toEqual([sinPlazo1.id, sinPlazo2.id]);
    const byCaption = new Map(items.map((item) => [item.caption, item.currentState]));
    expect(byCaption.get('MANUAL')).toMatchObject({ dueDate: '2026-09-05', manuallyAdjusted: true });
    // Negativo si venció, positivo si falta, null sin vencimiento. Un plazo vencido sigue abierto.
    expect(byCaption.get('VENCIDA').businessDaysRemaining).toBeLessThan(0);
    expect(byCaption.get('VENCE DESPUÉS').businessDaysRemaining).toBeGreaterThan(0);
    expect(byCaption.get('SIN PLAZO 1').businessDaysRemaining).toBeNull();
  });

  // CA-20.2. Los acentos NO se ignoran: es deuda aceptada, no un olvido.
  it('busca por apellido del cliente, por carátula y por SAC, sin distinguir mayúsculas pero sí acentos', async () => {
    const gomez = await createClient({ lastName: 'GÓMEZ', firstName: 'Ariel Fernando' });
    const quesada = await createClient({ lastName: 'QUESADA', firstName: 'Marta' });
    await createCase({ ...owner(), clientId: gomez.id, caption: 'CAUSA DEL ROBO' });
    await createCase({ ...owner(), clientId: quesada.id, caption: 'OTRA CAUSA', sacNumber: '13284571' });

    const found = async (search: string) => captions(expectPaginated<Item>(await list({ search })));

    expect(await found('quesada')).toEqual(['OTRA CAUSA']);
    expect(await found('del robo')).toEqual(['CAUSA DEL ROBO']);
    expect(await found('13284571')).toEqual(['OTRA CAUSA']);
    expect(await found('gómez')).toEqual(['CAUSA DEL ROBO']);
    expect(await found('GÓMEZ')).toEqual(['CAUSA DEL ROBO']);
    expect(await found('gomez')).toEqual([]);
  });

  // CA-20.3, CA-20.8
  it('filtra por fuero (también en minúsculas), por abogado responsable, por cliente y por plazo abierto', async () => {
    const otherClient = await createClient();
    const penal = await createCase({ ...owner(), caption: 'PENAL' });
    await createCase({ ...owner(), caption: 'AMPARO', jurisdiction: 'AMPARO' });
    await createCase({ ...owner(), caption: 'DE OTRO ABOGADO', responsibleLawyerId: s.otherLawyer.id });
    await createCase({ ...owner(), caption: 'DE OTRO CLIENTE', clientId: otherClient.id });
    await moveTo(penal.id, { computed: '2026-09-11' }); // vencido: el plazo sigue abierto

    const filtered = async (query: Record<string, unknown>) => captions(expectPaginated<Item>(await list(query)));

    expect(await filtered({ jurisdiction: 'amparo' })).toEqual(['AMPARO']);
    expect(await filtered({ responsibleLawyerId: s.otherLawyer.id })).toEqual(['DE OTRO ABOGADO']);
    expect(await filtered({ clientId: otherClient.id })).toEqual(['DE OTRO CLIENTE']);
    expect(await filtered({ openDeadline: true })).toEqual(['PENAL']);
  });

  // CA-20.4
  it('los tres filtros de estado filtran cada uno lo suyo; el escrito a mano, por coincidencia exacta sin mayúsculas', async () => {
    const enEstado = await createCase({ ...owner(), caption: 'EN ESTADO DE TABLA' });
    const escritoAMano = await createCase({ ...owner(), caption: 'ESCRITO A MANO' });
    await createCase({ ...owner(), caption: 'INICIADA' });
    await moveTo(enEstado.id, { stateId: s.states.fiveBusinessDays.stateId, computed: '2026-10-01' });
    await moveTo(escritoAMano.id, { customState: 'Con acusación, pero con oposición', computed: '2026-10-02' });

    const filtered = async (query: Record<string, unknown>) => captions(expectPaginated<Item>(await list(query)));

    expect(await filtered({ proceduralStateId: s.states.fiveBusinessDays.stateId })).toEqual(['EN ESTADO DE TABLA']);
    expect(await filtered({ customState: 'CON ACUSACIÓN, PERO CON OPOSICIÓN' })).toEqual(['ESCRITO A MANO']);
    expect(await filtered({ withoutProceduralActs: true })).toEqual(['INICIADA']);
  });

  /**
   * CA-20.6: un filtro sin resultados es 200 con la colección vacía, no 404.
   *
   * Desvío nombrado, sin fijar: para una colección vacía el contrato pide `totalPages`
   * en 0 (`API_CONTRACT_V5.md:8350`) y hoy llega 1 (`pagination.ts:84`). Por eso el
   * vacío mira `totalItems` y no `totalPages`.
   */
  it('pagina con el total del conjunto filtrado, y un filtro sin resultados devuelve la colección vacía', async () => {
    await createCase({ ...owner(), caption: 'UNA' });
    await createCase({ ...owner(), caption: 'DOS' });
    await createCase({ ...owner(), caption: 'TRES' });

    const second = expectPaginated<Item>(await list({ page: 2, limit: 2 }), {
      page: 2,
      limit: 2,
      totalItems: 3,
      totalPages: 2,
    });

    expect(captions(second)).toEqual(['TRES']);
    expect(expectPaginated(await list({ responsibleLawyerId: 999999 }), { totalItems: 0 })).toEqual([]);
  });

  describe('errores', () => {
    // CA-20.4: los filtros de estado son excluyentes, y el error nombra el que sobra.
    it('rechaza dos filtros de estado juntos con INVALID_REQUEST', async () => {
      expectError(await list({ proceduralStateId: 1, customState: 'Con oposición' }), 400, 'INVALID_REQUEST', [
        'customState',
      ]);
      expectError(await list({ withoutProceduralActs: true, proceduralStateId: 1 }), 400, 'INVALID_REQUEST', [
        'withoutProceduralActs',
      ]);
    });

    it('rechaza una página o un límite fuera de rango con INVALID_PAGINATION', async () => {
      expectError(await list({ page: 0 }), 400, 'INVALID_PAGINATION', ['page', 'limit']);
      expectError(await list({ limit: 500 }), 400, 'INVALID_PAGINATION', ['page', 'limit']);
    });

    // §5.3: un parámetro de consulta con un valor inexistente es INVALID_REQUEST.
    it('rechaza un fuero inexistente con INVALID_REQUEST y el texto del contrato', async () => {
      const res = await list({ jurisdiction: 'PENAL' });

      expect(res.status).toBe(400);
      expect(res.body.error).toEqual({
        code: 'INVALID_REQUEST',
        message: 'Parámetros de query inválidos.',
        details: { jurisdiction: 'No existe un fuero procesal con ese nombre.' },
      });
    });

    it('rechaza un parámetro desconocido o de tipo inválido con VALIDATION_ERROR, en castellano', async () => {
      const unknown = await list({ ordenar: 'fecha' });
      const wrongType = await list({ responsibleLawyerId: 'tres' });

      expect(unknown.status).toBe(400);
      expect(unknown.body.error).toEqual({
        code: 'VALIDATION_ERROR',
        message: 'Los datos enviados no son válidos.',
        details: { ordenar: 'No es un campo admitido.' },
      });
      expectError(wrongType, 400, 'VALIDATION_ERROR', ['responsibleLawyerId']);
      expect(wrongType.body.error.details).toEqual({ responsibleLawyerId: 'Debe ser un número entero.' });
    });
  });
});

describe('GET /api/v1/cases/{caseId} (HU22)', () => {
  /** Una causa con todos los datos de encabezado cargados. */
  async function aDetailedCase() {
    return getPrisma().case.create({
      data: {
        sacNumber: '13284571',
        caption: 'CAUSA',
        court: 'Juzgado de Control N° 3 · Córdoba',
        jurisdictionId: s.states.initial.jurisdictionId,
        proceduralRole: 'DEFENSA',
        instructorName: 'Dra. Verónica Ledesma',
        instructorPhone: '0351 448-1200',
        instructorExtension: '214',
        clientId: s.client.id,
        responsibleLawyerId: s.lawyer.id,
        startDate: civil('2021-03-12'),
        currentStateId: s.states.initial.stateId,
        createdByUserId: s.user.id,
      },
    });
  }

  // CA-22.1, CA-22.2. El detalle es EXACTAMENTE el recurso del listado: si alguien agrega
  // un campo en un endpoint y se olvida del otro, este test lo atrapa.
  it('devuelve el recurso en `{ data }`, con el cliente y el abogado resueltos, idéntico al del listado', async () => {
    const created = await aDetailedCase();
    await moveTo(created.id, { stateId: s.states.fiveBusinessDays.stateId, computed: '2026-09-16' });

    const item = await detail(created.id);
    const fromList = expectPaginated<Item>(await list()).find((entry) => entry.id === created.id);

    expect(item).toMatchObject({
      id: created.id,
      sacNumber: '13284571',
      caption: 'CAUSA',
      court: 'Juzgado de Control N° 3 · Córdoba',
      jurisdiction: 'CRIMINAL',
      proceduralRole: 'DEFENSA',
      instructorName: 'Dra. Verónica Ledesma',
      // La columna es `instructor_phone`; el contrato lo llama `tribunalPhone`.
      tribunalPhone: '0351 448-1200',
      instructorExtension: '214',
      counterparty: null,
      subjectMatter: null,
      client: { id: s.client.id, lastName: s.client.lastName, firstName: s.client.firstName },
      responsibleLawyer: {
        id: s.lawyer.id,
        lastName: 'Ríos',
        firstName: 'Malena',
        registrationNumber: s.lawyer.registrationNumber,
      },
      startDate: '2021-03-12',
      active: true,
    });
    expect(item).toEqual(fromList);
  });

  // CA-22.4 y el estado actual en sus tres formas.
  it('proyecta el estado actual: inicial con proceduralStateId en null, de la tabla con su id, escrito a mano con su texto', async () => {
    const inTable = await createCase(owner());
    const custom = await createCase(owner());
    const act = await moveTo(inTable.id, { stateId: s.states.fiveBusinessDays.stateId, computed: '2026-10-01' });
    await moveTo(custom.id, { customState: 'Con acusación, pero con oposición', computed: '2026-10-02' });

    // La columna del inicial apunta a la fila de "Iniciada"; el contrato pide null.
    expect((await detail(s.caseRow.id)).currentState).toEqual({
      proceduralStateId: null,
      name: 'Iniciada',
      custom: false,
      initial: true,
      proceduralActId: null,
      dueDate: null,
      businessDaysRemaining: null,
      manuallyAdjusted: false,
    });
    expect((await detail(inTable.id)).currentState).toMatchObject({
      proceduralStateId: s.states.fiveBusinessDays.stateId,
      name: 'Oposición al requerimiento de elevación',
      custom: false,
      initial: false,
      proceduralActId: act.id,
      dueDate: '2026-10-01',
      manuallyAdjusted: false,
    });
    expect((await detail(custom.id)).currentState).toMatchObject({
      proceduralStateId: null,
      name: 'Con acusación, pero con oposición',
      custom: true,
      initial: false,
      dueDate: '2026-10-02',
    });
  });

  // D-67 y D-78: los datos por fuero y el plazo del acto lesivo.
  it('un amparo en "Iniciada" muestra el acto lesivo y su plazo vencido; al salir de "Iniciada" el plazo vale null y el acto se conserva', async () => {
    const amparo = await createCase({
      ...owner(),
      caption: 'MOYANO, Daniela c/ APROSS — Amparo de salud',
      jurisdiction: 'AMPARO',
      harmfulAct: { date: '2026-01-05', termDays: 30, termDayType: 'CONSECUTIVE' },
    });

    const initial = await detail(amparo.id);
    expect(initial).toMatchObject({
      clientDetained: null,
      injunctionGranted: false,
      harmfulActDate: '2026-01-05',
      harmfulActRenews: false,
      harmfulActRenewalDays: null,
      harmfulActTermDays: 30,
      harmfulActTermDayType: 'CONSECUTIVE',
      harmfulActDeadline: { actDate: '2026-01-05', renewed: false, dueDate: '2026-02-04' },
      administrativeRemedyExhaustedOn: null,
      courtFeePaid: false,
      prescription: null, // sólo el fuero penal computa prescripción
      prescriptionDeclaration: null,
    });
    // Venció hace rato, y sigue abierto: negativo, no oculto.
    expect(initial.harmfulActDeadline.businessDaysRemaining).toBeLessThan(0);

    const informe = await createProceduralState({ jurisdiction: 'AMPARO', name: 'Pedido de informe' });
    await moveTo(amparo.id, { stateId: informe.stateId, computed: '2026-09-08' });

    expect(await detail(amparo.id)).toMatchObject({
      harmfulActDate: '2026-01-05',
      harmfulActTermDays: 30,
      harmfulActDeadline: null,
    });
  });

  it('una causa penal anterior a D-67, con NULL en la base, sale con clientDetained en false', async () => {
    const created = await aDetailedCase();

    expect(await detail(created.id)).toMatchObject({
      clientDetained: false,
      injunctionGranted: null,
      harmfulActDeadline: null,
      courtFeePaid: false,
    });
  });

  // CA-22.3, §3.7: rige la calificación que prescribe primero, aunque se haya cargado después.
  describe('prescription y prescriptionDeclaration', () => {
    let qualificationSeq = 0;

    /** Cuelga de la causa una calificación con su fecha del hecho, como la deja el alta (HU18). */
    async function addOffense(caseId: number, offenseDate: string, prescriptionMonths: number) {
      qualificationSeq += 1;
      const qualification = await createLegalQualification({
        prescriptionMonths,
        name: `HU22 calificación ${qualificationSeq} — art. ${qualificationSeq} CP`,
      });
      await getPrisma().offense.create({
        data: {
          caseId,
          legalQualificationId: qualification.id,
          offenseDate: civil(offenseDate),
          prescriptionDate: civil(offenseDate),
        },
      });
      return qualification;
    }

    it('devuelve la prescripción de la calificación que prescribe primero, calculada al día', async () => {
      await addOffense(s.caseRow.id, '2021-02-27', 180);
      const robo = await addOffense(s.caseRow.id, '2021-02-27', 96);

      const item = await detail(s.caseRow.id);

      // Al 06/10/2026: 2047 de 2922 días (70,05 %). Sin actos interruptivos, corre desde el hecho.
      expect(item.prescription).toEqual({
        legalQualificationId: robo.id,
        legalQualificationName: robo.name,
        startsOn: '2021-02-27',
        expiresOn: '2029-02-27',
        elapsedPercentage: 70,
        alert: true,
        expired: false,
        lastInterruptiveActDate: null,
      });
      expect(item.prescriptionDeclaration).toBeNull();
    });

    // D-112 (plan: .claude/plans/tests-d112-prescripcion-por-calificacion.md). Cada calificación
    // trae su estado; `prescription` sigue siendo la que prescribe primero aunque ya venció (D-52).
    it('cada calificación trae su estado de prescripción, y rige la de plazo cumplido', async () => {
      const a = await addOffense(s.caseRow.id, '2024-01-10', 24);
      const b = await addOffense(s.caseRow.id, '2024-01-10', 36);
      const c = await addOffense(s.caseRow.id, '2024-01-10', 72);

      const item = await detail(s.caseRow.id);
      const byId = [...item.legalQualifications].sort((x: { id: number }, y: { id: number }) => x.id - y.id);

      // Al 06/10/2026, 1000 días desde el hecho, sin actos interruptivos.
      expect(byId).toEqual([
        {
          id: a.id,
          name: a.name,
          prescriptionMonths: 24,
          offenseDate: '2024-01-10',
          prescriptionStartsOn: '2024-01-10',
          prescriptionExpiresOn: '2026-01-10',
          elapsedPercentage: 100, // 1000 de 731 días: tope 100
          alert: true,
          expired: true,
        },
        {
          id: b.id,
          name: b.name,
          prescriptionMonths: 36,
          offenseDate: '2024-01-10',
          prescriptionStartsOn: '2024-01-10',
          prescriptionExpiresOn: '2027-01-10',
          elapsedPercentage: 91, // 1000 de 1096 días: 91,24 %
          alert: true,
          expired: false,
        },
        {
          id: c.id,
          name: c.name,
          prescriptionMonths: 72,
          offenseDate: '2024-01-10',
          prescriptionStartsOn: '2024-01-10',
          prescriptionExpiresOn: '2030-01-10',
          elapsedPercentage: 46, // 1000 de 2192 días: 45,62 %
          alert: false,
          expired: false,
        },
      ]);
      expect(item.prescription).toEqual({
        legalQualificationId: a.id,
        legalQualificationName: a.name,
        startsOn: '2024-01-10',
        expiresOn: '2026-01-10',
        elapsedPercentage: 100,
        alert: true,
        expired: true,
        lastInterruptiveActDate: null,
      });
    });

    it('una causa marcada como prescripta devuelve la constancia y conserva su prescripción', async () => {
      const robo = await addOffense(s.caseRow.id, '2021-02-27', 96);
      await getPrisma().case.update({
        where: { id: s.caseRow.id },
        data: {
          prescriptionDate: civil('2026-09-15'),
          prescriptionResolution: 'Sentencia N° 214 del Juzgado de Control N° 3',
          prescriptionGrounds: null,
          prescriptionRegisteredByUserId: s.user.id,
          prescriptionRegisteredAt: new Date('2026-09-15T15:20:00.000Z'),
        },
      });

      const item = await detail(s.caseRow.id);

      expect(item.prescriptionDeclaration).toEqual({
        prescriptionDate: '2026-09-15',
        resolution: 'Sentencia N° 214 del Juzgado de Control N° 3',
        grounds: null,
        registeredBy: { id: s.user.id, lastName: s.user.lastName, firstName: s.user.firstName },
        registeredAt: '2026-09-15T12:20:00-03:00',
      });
      // §3.7: `prescription` se sigue devolviendo en una causa prescripta, como dato histórico.
      expect(item.prescription).toMatchObject({ legalQualificationId: robo.id, expiresOn: '2029-02-27' });
    });
  });

  // CA-22.6
  it('responde 404 CASE_NOT_FOUND para una causa inexistente y 400 INVALID_PATH_PARAMETER para un id que no es entero', async () => {
    const missing = await get(`${URL}/999999`);

    expectError(missing, 404, 'CASE_NOT_FOUND');
    expect(missing.body.error.message).toBe('No se encontró la causa solicitada.');
    for (const raw of ['abc', '0', '-3', '1.5']) {
      expectError(await get(`${URL}/${raw}`), 400, 'INVALID_PATH_PARAMETER', ['caseId']);
    }
  });
});

/**
 * HU27 (D-85): actos procesales, actos interruptivos y el pase a "Prescripta",
 * intercalados, completos y sin paginar.
 */
describe('GET /api/v1/cases/{caseId}/timeline (HU27)', () => {
  const url = (caseId: number | string = s.caseRow.id) => `${URL}/${caseId}/timeline`;
  const timeline = async (caseId: number = s.caseRow.id): Promise<Item[]> => {
    const res = await get(url(caseId));
    expect(res.status).toBe(200);
    // Sin paginar: solo `data`, sin bloque `pagination`.
    expect(Object.keys(res.body)).toEqual(['data']);
    return res.body.data;
  };
  const registerAct = async (body: Record<string, unknown>) => {
    const res = await server().post(`${URL}/${s.caseRow.id}/procedural-acts`).set(s.responsible).send(body);
    if (res.status !== 201) throw new Error(`acto procesal: ${res.status} ${JSON.stringify(res.body)}`);
    return res.body.data;
  };
  const registerInterruptive = async (name: string, actDate: string) => {
    const res = await server().post(`${URL}/${s.caseRow.id}/interruptive-acts`).set(s.responsible).send({ name, actDate });
    if (res.status !== 201) throw new Error(`acto interruptivo: ${res.status} ${JSON.stringify(res.body)}`);
    return res.body.data;
  };
  /** Lo que escribe HU33 al marcar la causa como prescripta. */
  const declarePrescription = (prescriptionDate: string) =>
    getPrisma().case.update({
      where: { id: s.caseRow.id },
      data: {
        prescriptionDate: civil(prescriptionDate),
        prescriptionResolution: 'Auto N° 123',
        prescriptionGrounds: 'Transcurrió el plazo del art. 62 CP.',
        prescriptionRegisteredByUserId: s.user.id,
        prescriptionRegisteredAt: new Date('2026-10-06T15:30:00.000Z'),
      },
    });
  const shape = (entries: Item[]) => entries.map((e) => `${e.type} ${e.date}`);

  // CA-27.1, CA-27.2, CA-27.3
  it('intercala las tres fuentes de la más reciente a la más antigua, cada entrada con su tipo, su fecha y su recurso', async () => {
    await registerAct({ proceduralStateId: s.states.fiveBusinessDays.stateId, actDate: '2025-05-10' });
    await registerInterruptive('Indagatoria', '2024-07-04');
    await registerAct({ proceduralStateId: s.states.withoutTerm.stateId, actDate: '2023-01-15' });
    await declarePrescription('2026-09-30');

    const entries = await timeline();

    expect(shape(entries)).toEqual([
      'PRESCRIPTION_DECLARATION 2026-09-30',
      'PROCEDURAL_ACT 2025-05-10',
      'INTERRUPTIVE_ACT 2024-07-04',
      'PROCEDURAL_ACT 2023-01-15',
    ]);
    const [declaration, procedural, interruptive] = entries;
    expect(Object.keys(procedural).sort()).toEqual(['current', 'date', 'proceduralAct', 'type']);
    expect(Object.keys(interruptive).sort()).toEqual(['date', 'governsPrescription', 'interruptiveAct', 'type']);
    expect(declaration).toEqual({
      type: 'PRESCRIPTION_DECLARATION',
      date: '2026-09-30',
      prescriptionDeclaration: {
        prescriptionDate: '2026-09-30',
        resolution: 'Auto N° 123',
        grounds: 'Transcurrió el plazo del art. 62 CP.',
        registeredBy: { id: s.user.id, lastName: expect.any(String), firstName: expect.any(String) },
        registeredAt: '2026-10-06T12:30:00-03:00',
      },
    });
  });

  /** La línea de vida no tiene una forma parecida que pueda divergir de la de cada endpoint. */
  it('cada acto es idéntico al que devuelve su propio endpoint', async () => {
    const act = await registerAct({ proceduralStateId: s.states.fiveBusinessDays.stateId, actDate: '2025-05-10' });
    const interruptive = await registerInterruptive('Indagatoria', '2024-07-04');

    const [procEntry, intEntry] = await timeline();
    const single = await get(`${URL}/${s.caseRow.id}/procedural-acts/${act.id}`);

    expect(procEntry.proceduralAct).toEqual(act);
    expect(procEntry.proceduralAct).toEqual(single.body.data);
    expect(intEntry.interruptiveAct).toEqual(interruptive);
  });

  /** Más actos que una página del listado (20): la línea de vida llega entera. */
  it('devuelve la línea de vida completa, sin cortar en una página', async () => {
    for (let day = 1; day <= 25; day += 1) {
      await createProceduralAct({
        caseId: s.caseRow.id,
        registeredByUserId: s.user.id,
        registeredByLawyerId: s.lawyer.id,
        proceduralStateId: s.states.withoutTerm.stateId,
        actDate: `2026-08-${String(day).padStart(2, '0')}`,
      });
    }

    const entries = await timeline();

    expect(entries).toHaveLength(25);
    expect(entries[24].date).toBe('2026-08-01');
  });

  // CA-27.4 y CA-27.11
  it('marca vigente sólo el acto que llevó la causa a su estado actual, y rige el interruptivo de fecha más reciente', async () => {
    const older = await registerAct({ proceduralStateId: s.states.withoutTerm.stateId, actDate: '2026-09-01' });
    const current = await registerAct({ proceduralStateId: s.states.fiveBusinessDays.stateId, actDate: '2026-10-01' });
    const governing = await registerInterruptive('Indagatoria', '2024-07-04');
    const olderInterruptive = await registerInterruptive('Citación a juicio', '2023-03-01');

    const entries = await timeline();

    expect(entries.filter((e) => e.proceduralAct).map((e) => [e.proceduralAct.id, e.current])).toEqual([
      [current.id, true],
      [older.id, false],
    ]);
    expect(entries.filter((e) => e.interruptiveAct).map((e) => [e.interruptiveAct.id, e.governsPrescription])).toEqual([
      [governing.id, true],
      [olderInterruptive.id, false],
    ]);
  });

  // CA-27.13, CA-27.14
  it('sin movimientos la línea está vacía ("Iniciada" no es uno), y una causa no penal muestra sólo los actos procesales', async () => {
    const administrative = await createCase({ ...owner(), jurisdiction: 'ADMINISTRATIVE' });
    await createProceduralAct({
      caseId: administrative.id,
      registeredByUserId: s.user.id,
      registeredByLawyerId: s.lawyer.id,
      proceduralStateId: s.states.administrative.stateId,
      actDate: '2026-09-01',
    });

    expect(await timeline()).toEqual([]);
    expect(shape(await timeline(administrative.id))).toEqual(['PROCEDURAL_ACT 2026-09-01']);
  });

  // CA-27.16
  it('responde 404 para una causa inexistente y 400 para un id que no es entero', async () => {
    expectError(await get(url(999999)), 404, 'CASE_NOT_FOUND');
    expectError(await get(url('abc')), 400, 'INVALID_PATH_PARAMETER', ['caseId']);
  });
});

/**
 * HU20, CA-20.4: alimenta el grupo "Escritos a mano" del filtro de estado. La ruta está
 * declarada ARRIBA de `@Get(':caseId')`; si se invierten, `custom-states` pasa a
 * responder 400 tomándolo como un caseId, y estos tests fallan.
 */
describe('GET /api/v1/cases/custom-states (HU20)', () => {
  const CUSTOM_URL = `${URL}/custom-states`;

  it('devuelve `{ data }` sin paginar: cada estado escrito a mano una vez, en orden alfabético, sin los de causas dadas de baja ni "Iniciada"', async () => {
    await createCase({ ...owner(), currentCustomState: 'Zeta' });
    await createCase({ ...owner(), currentCustomState: 'Alfa' });
    await createCase({ ...owner(), currentCustomState: 'Alfa' });
    const baja = await createCase({ ...owner(), currentCustomState: 'De una causa de baja' });
    await deactivateCase(baja.id);

    const res = await get(CUSTOM_URL);

    // `s.caseRow` está en "Iniciada", que guarda el id del estado y no un texto.
    expect(res.status).toBe(200);
    expect(res.body).toEqual({ data: ['Alfa', 'Zeta'] });
  });

  it('filtra por fuero, acepta el código en minúsculas y rechaza uno inexistente con INVALID_REQUEST', async () => {
    await createCase({ ...owner(), currentCustomState: 'Del penal' });
    await createCase({ ...owner(), jurisdiction: 'AMPARO', currentCustomState: 'Del amparo' });

    expect((await get(CUSTOM_URL, { jurisdiction: 'criminal' })).body.data).toEqual(['Del penal']);
    expect((await get(CUSTOM_URL, { jurisdiction: 'AMPARO' })).body.data).toEqual(['Del amparo']);
    // "PENAL" es el rótulo; el código es CRIMINAL.
    expectError(await get(CUSTOM_URL, { jurisdiction: 'PENAL' }), 400, 'INVALID_REQUEST', ['jurisdiction']);
  });
});

/** D-97: una causa dada de baja desaparece del listado y sus subrecursos dan 404. */
describe('causa dada de baja', () => {
  it('no aparece en el listado, y el detalle y la línea de vida responden 404 CASE_NOT_FOUND', async () => {
    await createProceduralAct({
      caseId: s.caseRow.id,
      registeredByUserId: s.user.id,
      registeredByLawyerId: s.lawyer.id,
      proceduralStateId: s.states.fiveBusinessDays.stateId,
      actDate: '2025-05-10',
      asCurrent: true,
    });
    await deactivateCase(s.caseRow.id);

    expect(expectPaginated<Item>(await list()).map((item) => item.id)).not.toContain(s.caseRow.id);
    expectError(await get(`${URL}/${s.caseRow.id}`), 404, 'CASE_NOT_FOUND');
    expectError(await get(`${URL}/${s.caseRow.id}/timeline`), 404, 'CASE_NOT_FOUND');
  });
});

/**
 * Con login real, lo que se verifica es el seed (seed → `role_permissions` → login →
 * claims → guard). RN11 y CA-27.15: todo el estudio ve todas las causas, sea o no el
 * responsable.
 */
describe('Permisos de lectura de causas', () => {
  it.each<TestRole>(['ADMINISTRATOR', 'LAWYER', 'SECRETARY'])(
    'un %s que no es el responsable consulta el listado, el detalle, la línea de vida y los estados escritos a mano',
    async (role) => {
      const lawyerId = role === 'LAWYER' ? (await createLawyer()).id : null;
      const user = await createUser({ roles: [role], lawyerId, passwordHash: await bcrypt.hash('password1', 4) });
      const login = await server().post('/api/v1/auth/login').send({ username: user.username, password: 'password1' });
      expect(login.status).toBe(200);
      const auth = { Authorization: `Bearer ${login.body.data.accessToken}` };

      expect(expectPaginated<Item>(await server().get(URL).set(auth)).map((item) => item.id)).toEqual([s.caseRow.id]);
      expectData(await server().get(`${URL}/${s.caseRow.id}`).set(auth), 200);
      for (const path of [`${URL}/${s.caseRow.id}/timeline`, `${URL}/custom-states`]) {
        const res = await server().get(path).set(auth);
        expect({ path, status: res.status }).toEqual({ path, status: 200 });
        expect(res.body).toEqual({ data: [] });
      }
    },
  );
});
