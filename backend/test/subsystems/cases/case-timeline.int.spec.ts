import { INestApplication } from '@nestjs/common';
import request from 'supertest';
import * as bcrypt from 'bcryptjs';

import { getPrisma, startTestApp, stopTestApp } from '../../shared/harness/test-app';
import { withFixedClock } from '../../shared/harness/fixed-clock';
import { expectError } from '../../shared/contract/envelopes';
import { TestRole } from '../../shared/auth/login-as';
import { createCase } from '../../shared/factories/case.factory';
import { createLawyer } from '../../shared/factories/lawyer.factory';
import { createProceduralAct } from '../../shared/factories/procedural-act.factory';
import { createUser } from '../../shared/factories/user.factory';
import {
  ProceduralActScenario,
  resetProceduralActData,
  setUpProceduralActScenario,
} from '../../shared/factories/procedural-act-scenario';

/*
 * HU27 Consultar línea de vida de la causa (contrato V4, D-85):
 *   GET /cases/{caseId}/timeline
 *
 * Actos procesales, actos interruptivos y el pase a "Prescripta", intercalados,
 * completos y sin paginar. "Hoy" es el martes 6/10/2026 (reloj fijo).
 */
type Entry = Record<string, any>;

describe('GET /api/v1/cases/:caseId/timeline', () => {
  let app: INestApplication;
  let s: ProceduralActScenario;

  const server = () => request(app.getHttpServer());
  const url = (caseId: number | string = s.caseRow.id) => `/api/v1/cases/${caseId}/timeline`;
  const timeline = async (caseId: number = s.caseRow.id): Promise<Entry[]> => {
    const res = await server().get(url(caseId)).set(s.notResponsible);
    expect(res.status).toBe(200);
    // Sin paginar: solo `data`, sin bloque `pagination`.
    expect(Object.keys(res.body)).toEqual(['data']);
    return res.body.data;
  };
  const registerAct = async (body: Record<string, unknown>) => {
    const res = await server().post(`/api/v1/cases/${s.caseRow.id}/procedural-acts`).set(s.responsible).send(body);
    if (res.status !== 201) throw new Error(`acto procesal: ${res.status} ${JSON.stringify(res.body)}`);
    return res.body.data;
  };
  const registerInterruptive = async (name: string, actDate: string) => {
    const res = await server()
      .post(`/api/v1/cases/${s.caseRow.id}/interruptive-acts`)
      .set(s.responsible)
      .send({ name, actDate });
    if (res.status !== 201) throw new Error(`acto interruptivo: ${res.status} ${JSON.stringify(res.body)}`);
    return res.body.data;
  };
  /** Lo que escribe HU33 al marcar la causa como prescripta (todavía sin endpoint). */
  const declarePrescription = (prescriptionDate: string) =>
    getPrisma().case.update({
      where: { id: s.caseRow.id },
      data: {
        prescriptionDate: new Date(`${prescriptionDate}T00:00:00.000Z`),
        prescriptionResolution: 'Auto N° 123',
        prescriptionGrounds: 'Transcurrió el plazo del art. 62 CP.',
        prescriptionRegisteredByUserId: s.user.id,
        prescriptionRegisteredAt: new Date('2026-10-06T15:30:00.000Z'),
      },
    });
  const shape = (entries: Entry[]) => entries.map((e) => `${e.type} ${e.date}`);

  beforeAll(async () => {
    app = await startTestApp(withFixedClock);
  });

  afterAll(async () => {
    await resetProceduralActData();
    await stopTestApp();
  });

  beforeEach(async () => {
    s = await setUpProceduralActScenario();
  });

  // CA-27.1 y CA-27.2
  it('intercala las tres fuentes, de la más reciente a la más antigua', async () => {
    await registerAct({ proceduralStateId: s.states.fiveBusinessDays.stateId, actDate: '2025-05-10' });
    await registerInterruptive('Indagatoria', '2024-07-04');
    await registerAct({ proceduralStateId: s.states.withoutTerm.stateId, actDate: '2023-01-15' });
    await declarePrescription('2026-09-30');

    expect(shape(await timeline())).toEqual([
      'PRESCRIPTION_DECLARATION 2026-09-30',
      'PROCEDURAL_ACT 2025-05-10',
      'INTERRUPTIVE_ACT 2024-07-04',
      'PROCEDURAL_ACT 2023-01-15',
    ]);
  });

  /**
   * Cada entrada lleva el recurso **idéntico** al de su propio endpoint: la
   * línea de vida no tiene una forma parecida que pueda divergir.
   */
  it('cada acto es idéntico al que devuelve su propio endpoint', async () => {
    const act = await registerAct({ proceduralStateId: s.states.fiveBusinessDays.stateId, actDate: '2025-05-10' });
    const interruptive = await registerInterruptive('Indagatoria', '2024-07-04');

    const [procEntry, intEntry] = await timeline();

    expect(procEntry.proceduralAct).toEqual(act);
    const single = await server().get(`/api/v1/cases/${s.caseRow.id}/procedural-acts/${act.id}`).set(s.notResponsible);
    expect(procEntry.proceduralAct).toEqual(single.body.data);
    expect(intEntry.interruptiveAct).toEqual(interruptive);
  });

  /** Más actos que una página del listado (20): la línea de vida llega entera. */
  it('devuelve la línea de vida completa, sin cortar en una página', async () => {
    const base = { caseId: s.caseRow.id, registeredByUserId: s.user.id, registeredByLawyerId: s.lawyer.id };
    for (let day = 1; day <= 25; day += 1) {
      await createProceduralAct({
        ...base,
        proceduralStateId: s.states.withoutTerm.stateId,
        actDate: `2026-08-${String(day).padStart(2, '0')}`,
      });
    }

    const entries = await timeline();

    expect(entries).toHaveLength(25);
    expect(entries[24].date).toBe('2026-08-01');
  });

  // CA-27.3 y forma de cada tipo de entrada
  it('cada entrada tiene su tipo, su fecha y su recurso', async () => {
    await registerAct({ proceduralStateId: s.states.fiveBusinessDays.stateId, actDate: '2025-05-10' });
    await registerInterruptive('Indagatoria', '2024-07-04');
    await declarePrescription('2026-09-30');

    const [declaration, procedural, interruptive] = await timeline();

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

  // CA-27.4
  it('marca como vigente solo el acto que llevó la causa a su estado actual', async () => {
    const older = await registerAct({ proceduralStateId: s.states.withoutTerm.stateId, actDate: '2026-09-01' });
    const current = await registerAct({ proceduralStateId: s.states.fiveBusinessDays.stateId, actDate: '2026-10-01' });

    const entries = await timeline();

    expect(entries.map((e) => [e.proceduralAct.id, e.current])).toEqual([
      [current.id, true],
      [older.id, false],
    ]);
  });

  // CA-27.11
  it('marca el interruptivo que rige: el de fecha más reciente, no el último registrado', async () => {
    const governing = await registerInterruptive('Indagatoria', '2024-07-04');
    const older = await registerInterruptive('Citación a juicio', '2023-03-01');

    const entries = await timeline();

    expect(entries.map((e) => [e.interruptiveAct.id, e.governsPrescription])).toEqual([
      [governing.id, true],
      [older.id, false],
    ]);
  });

  // CA-27.13
  it('en una causa que no es penal muestra solo los actos procesales', async () => {
    const administrative = await createCase({
      clientId: s.client.id,
      responsibleLawyerId: s.lawyer.id,
      createdByUserId: s.user.id,
      jurisdiction: 'ADMINISTRATIVE',
    });
    await createProceduralAct({
      caseId: administrative.id,
      registeredByUserId: s.user.id,
      registeredByLawyerId: s.lawyer.id,
      proceduralStateId: s.states.administrative.stateId,
      actDate: '2026-09-01',
    });

    expect(shape(await timeline(administrative.id))).toEqual(['PROCEDURAL_ACT 2026-09-01']);
  });

  // CA-27.14
  it('una causa sin movimientos devuelve la línea vacía: "Iniciada" no es un movimiento', async () => {
    expect(await timeline()).toEqual([]);
  });

  // CA-27.16
  it('responde 404 para una causa inexistente', async () => {
    expectError(await server().get(url(999999)).set(s.notResponsible), 404, 'CASE_NOT_FOUND');
  });

  it('responde 404 para una causa dada de baja', async () => {
    await registerAct({ proceduralStateId: s.states.fiveBusinessDays.stateId, actDate: '2025-05-10' });
    await getPrisma().case.update({ where: { id: s.caseRow.id }, data: { active: false } });

    expectError(await server().get(url()).set(s.notResponsible), 404, 'CASE_NOT_FOUND');
  });

  it('rechaza un caseId que no es un entero', async () => {
    expectError(await server().get(url('abc')).set(s.notResponsible), 400, 'INVALID_PATH_PARAMETER', ['caseId']);
  });

  // CA-27.17
  it('exige autenticación', async () => {
    await server().get(url()).expect(401);
  });

  // CA-27.15, con login real
  it.each<TestRole>(['ADMINISTRATOR', 'LAWYER', 'SECRETARY'])('%s puede consultarla sin ser el responsable', async (role) => {
    await registerAct({ proceduralStateId: s.states.fiveBusinessDays.stateId, actDate: '2025-05-10' });
    const lawyerId = role === 'LAWYER' ? (await createLawyer()).id : null;
    const user = await createUser({ roles: [role], lawyerId, passwordHash: await bcrypt.hash('password1', 4) });
    const login = await server().post('/api/v1/auth/login').send({ username: user.username, password: 'password1' });

    const res = await server().get(url()).set({ Authorization: `Bearer ${login.body.data.accessToken}` });

    expect(res.status).toBe(200);
    expect(res.body.data).toHaveLength(1);
  });
});
