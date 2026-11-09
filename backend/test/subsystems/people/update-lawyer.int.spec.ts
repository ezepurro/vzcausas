import { INestApplication } from '@nestjs/common';
import request from 'supertest';
import * as bcrypt from 'bcryptjs';

import { getPrisma, startTestApp, stopTestApp } from '../../shared/harness/test-app';
import { withFixedClock } from '../../shared/harness/fixed-clock';
import { purgeAuditLog } from '../../shared/harness/audit-log';
import { expectData, expectError } from '../../shared/contract/envelopes';
import { TestRole } from '../../shared/auth/login-as';
import { createLawyer } from '../../shared/factories/lawyer.factory';
import { createUser } from '../../shared/factories/user.factory';
import {
  ProceduralActScenario,
  resetProceduralActData,
  setUpProceduralActScenario,
} from '../../shared/factories/procedural-act-scenario';

/*
 * HU14 · Modificar abogado: PATCH /lawyers/{lawyerId} (contrato V5 §3.3).
 *
 * Escrito desde `.claude/plans/tests-hu14-modificar-abogado.md`, no desde el
 * código. Reloj fijo: ahora es 06/10/2026 12:30 en Córdoba.
 *
 * La abogada de referencia es la del escenario de actos procesales (Ríos,
 * Malena), que ya es responsable de una causa: con eso se ve CA-14.2. El
 * administrador inicia sesión de verdad, así el permiso `lawyer:update` sale
 * del seed y no de un token armado a mano.
 */
type Body = Record<string, any>;
const NOW = new Date('2026-10-06T15:30:00.000Z');

describe('PATCH /api/v1/lawyers/:lawyerId', () => {
  let app: INestApplication;
  let s: ProceduralActScenario;
  let admin: { id: number; auth: { Authorization: string } };

  const server = () => request(app.getHttpServer());
  const url = (id: number | string = s.lawyer.id) => `/api/v1/lawyers/${id}`;
  const patch = (body: unknown, id?: number | string, auth = admin.auth) =>
    server().patch(url(id)).set(auth).set('X-Correlation-Id', 'corr-hu14').send(body as object);

  /** Lo que un rechazo no puede tocar: la fila del abogado y la auditoría. */
  const snapshot = async () => ({
    lawyer: await getPrisma().lawyer.findUnique({ where: { id: s.lawyer.id } }),
    audit: await getPrisma().auditLog.count(),
  });

  const loginWith = async (roles: TestRole[], lawyerId: number | null = null) => {
    const user = await createUser({ roles, lawyerId, passwordHash: await bcrypt.hash('password1', 4) });
    const login = await server().post('/api/v1/auth/login').send({ username: user.username, password: 'password1' });
    return { id: user.id, auth: { Authorization: `Bearer ${login.body.data.accessToken}` } };
  };

  beforeAll(async () => {
    app = await startTestApp(withFixedClock);
  });

  afterAll(async () => {
    await purgeAuditLog();
    await resetProceduralActData();
    await stopTestApp();
  });

  beforeEach(async () => {
    // Antes de borrar usuarios: la auditoría los referencia.
    await purgeAuditLog();
    s = await setUpProceduralActScenario();
    admin = await loginWith(['ADMINISTRATOR']);
  });

  describe('modificación exitosa', () => {
    // CA-14.1
    it('responde 200 con el abogado en la forma del contrato y el cambio queda en la base', async () => {
      const res = await patch({ lastName: ' Peralta ', firstName: 'Ignacio', registrationNumber: '1-40000' });

      const data = expectData<Body>(res, 200);
      expect(data).toEqual({
        id: s.lawyer.id,
        lastName: 'Peralta',
        firstName: 'Ignacio',
        registrationNumber: '1-40000',
        activeCases: 1,
        active: true,
      });
      expect(await getPrisma().lawyer.findUnique({ where: { id: s.lawyer.id } })).toMatchObject({
        lastName: 'Peralta',
        firstName: 'Ignacio',
        registrationNumber: '1-40000',
        active: true,
      });
    });

    // CA-14.2, CA-14.14: la causa referencia al abogado, no lo copia
    it('la causa del abogado muestra el nombre nuevo en la siguiente lectura', async () => {
      await patch({ lastName: 'Peralta', firstName: 'Ignacio' }).expect(200);

      const caseRes = await server().get(`/api/v1/cases/${s.caseRow.id}`).set(admin.auth);

      expect(expectData<Body>(caseRes, 200).responsibleLawyer).toMatchObject({
        id: s.lawyer.id,
        lastName: 'Peralta',
        firstName: 'Ignacio',
      });
    });

    // CA-14.5
    it('deja una fila de auditoría: quién, cuándo y qué campos, sin sus valores', async () => {
      await patch({ firstName: 'Malena Sofía', registrationNumber: '1-40000' }).expect(200);

      const rows = await getPrisma().auditLog.findMany();
      expect(rows).toHaveLength(1);
      expect(rows[0]).toMatchObject({
        actorUserId: admin.id,
        action: 'lawyer.updated',
        entityType: 'Lawyer',
        entityId: String(s.lawyer.id),
        occurredAt: NOW,
        metadata: { changedFields: ['firstName', 'registrationNumber'] },
        correlationId: 'corr-hu14',
      });
      expect(JSON.stringify(rows[0].metadata)).not.toContain('Sofía');
    });
  });

  describe('datos inválidos', () => {
    // CA-14.4, CA-14.8, CA-14.9
    it.each<[string, Body, Record<string, string>]>([
      ['apellido vacío', { lastName: '' }, { lastName: 'El apellido es obligatorio.' }],
      ['apellido solo de espacios', { lastName: '   ' }, { lastName: 'El apellido es obligatorio.' }],
      ['apellido null', { lastName: null }, { lastName: 'El apellido es obligatorio.' }],
      ['nombres vacíos', { firstName: '' }, { firstName: 'Los nombres son obligatorios.' }],
      ['matrícula con otro formato', { registrationNumber: '28114' }, { registrationNumber: 'El formato de la matrícula no es válido.' }],
      ['"Dr." en los nombres', { firstName: 'Dr. Ignacio' }, { firstName: 'Los nombres no llevan el tratamiento (Dr., Dra.).' }],
      ['"Dra." en los nombres', { firstName: 'Dra. Malena' }, { firstName: 'Los nombres no llevan el tratamiento (Dr., Dra.).' }],
      [
        'varios campos a la vez',
        { lastName: '', registrationNumber: 'abc' },
        { lastName: 'El apellido es obligatorio.', registrationNumber: 'El formato de la matrícula no es válido.' },
      ],
    ])('%s: 400 sobre el campo y no se escribe nada', async (_case, body, details) => {
      const before = await snapshot();

      const res = await patch(body);

      expectError(res, 400, 'VALIDATION_ERROR', Object.keys(details));
      expect(res.body.error.message).toBe('Los datos enviados no son válidos.');
      expect(res.body.error.details).toEqual(details);
      expect(await snapshot()).toEqual(before);
    });

    // CA-14.10
    it.each<[string, Body, Record<string, string>]>([
      ['sin ningún campo', {}, { body: 'Debe enviarse al menos un campo para modificar.' }],
      ['con activeCases', { lastName: 'Peralta', activeCases: 9 }, { activeCases: 'No es un campo admitido.' }],
    ])('%s: 400 y no se escribe nada', async (_case, body, details) => {
      const before = await snapshot();

      const res = await patch(body);

      expectError(res, 400, 'VALIDATION_ERROR', Object.keys(details));
      expect(res.body.error.details).toEqual(details);
      expect(await snapshot()).toEqual(before);
    });
  });

  describe('matrícula y existencia', () => {
    // CA-14.3
    it('la matrícula de otro abogado es 409 y no se escribe nada', async () => {
      const other = await createLawyer({ registrationNumber: '1-35207' });
      const before = await snapshot();

      const res = await patch({ lastName: 'Peralta', registrationNumber: other.registrationNumber });

      // Desvío 3 del documento: el `message` del contrato no se fija hasta que se traduzca.
      expectError(res, 409, 'LAWYER_REGISTRATION_ALREADY_EXISTS');
      expect(await snapshot()).toEqual(before);
    });

    // D-107: la matrícula es opcional; null o vacía la borra, y se puede volver a cargar.
    it.each<[string, unknown]>([
      ['null', null],
      ['vacía', ''],
    ])('enviar la matrícula %s la borra, y otro abogado puede quedar sin ella también', async (_case, value) => {
      const other = await createLawyer({ registrationNumber: null });

      const res = await patch({ registrationNumber: value });

      expect(expectData<Body>(res, 200)).toMatchObject({ id: s.lawyer.id, registrationNumber: null });
      expect(await getPrisma().lawyer.findUnique({ where: { id: s.lawyer.id } })).toMatchObject({ registrationNumber: null });
      expect(other.registrationNumber).toBeNull();

      const reloaded = await patch({ registrationNumber: '1-40000' });
      expect(expectData<Body>(reloaded, 200)).toMatchObject({ registrationNumber: '1-40000' });
    });

    // CA-14.7
    it('enviar su propia matrícula no es conflicto', async () => {
      const res = await patch({ lastName: 'Peralta', registrationNumber: s.lawyer.registrationNumber });

      expect(expectData<Body>(res, 200)).toMatchObject({ lastName: 'Peralta', registrationNumber: s.lawyer.registrationNumber });
    });

    // CA-14.11
    it('un abogado inexistente o dado de baja es 404; un id no entero, 400', async () => {
      const deactivated = await createLawyer({ active: false });

      for (const id of [999999, deactivated.id]) {
        const res = await patch({ lastName: 'Peralta' }, id);
        // Desvío 2 del documento: hoy `details` trae el id; el contrato dice `null`.
        expect(res.status).toBe(404);
        expect(res.body.error).toMatchObject({ code: 'LAWYER_NOT_FOUND', message: 'No se encontró el abogado solicitado.' });
      }
      expect((await getPrisma().lawyer.findUnique({ where: { id: deactivated.id } }))?.lastName).not.toBe('Peralta');

      const invalid = await patch({ lastName: 'Peralta' }, 'abc');
      expectError(invalid, 400, 'INVALID_PATH_PARAMETER', ['lawyerId']);
      expect(invalid.body.error.message).toBe('El identificador del abogado no es válido.');
    });
  });

  describe('acceso', () => {
    // CA-14.6, con login real
    it.each<[TestRole]>([['LAWYER'], ['SECRETARY']])('un usuario %s recibe 403 y no se escribe nada', async (role) => {
      // Un abogado propio: los del escenario ya tienen usuario, y la base admite uno solo por abogado.
      const user = await loginWith([role], role === 'LAWYER' ? (await createLawyer()).id : null);
      const before = await snapshot();

      const res = await patch({ lastName: 'Peralta' }, undefined, user.auth);

      // Desvío 1 del documento: el guard responde su propio texto en todos los endpoints.
      expectError(res, 403, 'FORBIDDEN');
      expect(await snapshot()).toEqual(before);
    });

    it('sin token responde 401', async () => {
      const res = await server().patch(url()).send({ lastName: 'Peralta' });

      expectError(res, 401, 'UNAUTHENTICATED');
    });
  });
});
