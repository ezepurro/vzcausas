import { INestApplication } from '@nestjs/common';
import request from 'supertest';
import * as bcrypt from 'bcryptjs';

import { DOCUMENT_STORAGE } from '../../../src/subsystems/documents/core/domain/ports/document-storage.port';
import { InMemoryDocumentStorage } from '../../../src/subsystems/documents/infrastructure/storage/in-memory/in-memory-document-storage';
import { expectData } from '../../shared/contract/envelopes';
import { createLawyer } from '../../shared/factories/lawyer.factory';
import { createProceduralState } from '../../shared/factories/procedural-state.factory';
import { createUser } from '../../shared/factories/user.factory';
import { createCloudStructure } from '../../shared/factories/cloud-structure.factory';
import {
  CASES_URL,
  CaseFolderActors,
  registerCase,
  resetDatabaseForCaseFolders,
  seedCaseFolderActors,
  waitForFolderStatus,
} from '../../shared/harness/case-folder-scenario';
import { getPrisma, startTestApp, stopTestApp } from '../../shared/harness/test-app';

/*
 * HU15 · Lo que la baja de un abogado hace en Drive (D-143, D-132), de punta a punta: las carpetas de sus
 * causas siguen a cada causa (a otro abogado o a `Sin asignar`) y la carpeta del propio abogado va a la
 * `Papelera`, salvo que conserve causas terminales.
 *
 * Los suscriptores de Drive corren después de la respuesta, en cualquier orden: el estado final se
 * espera con una consulta, sin pausas fijas. Contra un almacenamiento en memoria, no contra Drive: el
 * movimiento real de carpetas con las cuentas de Google queda para revisión manual.
 */
type Body = Record<string, any>;

describe('DELETE /api/v1/lawyers/:lawyerId: las carpetas en Drive', () => {
  let app: INestApplication;
  let storage: InMemoryDocumentStorage;
  let actors: CaseFolderActors;
  let admin: { Authorization: string };
  let gaga: { id: number };

  const server = () => request(app.getHttpServer());
  const remove = (body?: unknown) => {
    const req = server().delete(`/api/v1/lawyers/${actors.lawyerId}`).set(admin);
    return body === undefined ? req : req.send(body as object);
  };
  const pathOf = async (caseId: number) =>
    expectData<Body>(await server().get(`${CASES_URL}/${caseId}`).set(actors.actor), 200).folder.path as string | null;

  async function waitUntil(condition: () => Promise<boolean>, timeoutMs = 5000): Promise<void> {
    const deadline = Date.now() + timeoutMs;
    while (Date.now() < deadline) {
      if (await condition()) return;
      await new Promise((resolve) => setTimeout(resolve, 20));
    }
    throw new Error('Drive no llegó al estado esperado');
  }

  /** Registra una causa penal con su carpeta ya creada. */
  async function aCaseWithFolder(caption: string): Promise<number> {
    const { id } = expectData<Body>(await registerCase(app, actors, { caption }), 201);
    await waitForFolderStatus(id, 'CREATED');
    return id;
  }

  const lawyerFolder = () => storage.folders.find((f) => f.name === 'Ríos, Malena')!;
  const bin = () => storage.folders.find((f) => f.name === 'Papelera');

  beforeAll(async () => {
    app = await startTestApp((builder) => builder.overrideProvider(DOCUMENT_STORAGE).useClass(InMemoryDocumentStorage));
    storage = app.get(DOCUMENT_STORAGE);
  });

  afterAll(async () => {
    await resetDatabaseForCaseFolders();
    await stopTestApp();
  });

  beforeEach(async () => {
    await resetDatabaseForCaseFolders();
    actors = await seedCaseFolderActors();
    storage.reset();
    await createCloudStructure(storage);
    gaga = await createLawyer({ lastName: 'Gaga', firstName: 'Pablo' });
    const user = await createUser({ roles: ['ADMINISTRATOR'], passwordHash: await bcrypt.hash('password1', 4) });
    const login = await server().post('/api/v1/auth/login').send({ username: user.username, password: 'password1' });
    admin = { Authorization: `Bearer ${login.body.data.accessToken}` };
  });

  it('la causa reasignada va a la carpeta del abogado nuevo, la huérfana a Sin asignar, y la carpeta del abogado a la Papelera', async () => {
    const reassigned = await aCaseWithFolder('GÓMEZ, Ariel c/ Robo');
    const orphaned = await aCaseWithFolder('PÉREZ, Luis c/ Estafa');

    await remove({
      reassignments: [
        { caseId: reassigned, responsibleLawyerId: gaga.id },
        { caseId: orphaned, unassigned: true },
      ],
    }).expect(204);

    await waitUntil(async () => (await pathOf(reassigned)) === '/VZ Causas/Causas/Gaga, Pablo/Penal/GÓMEZ, Ariel c Robo');
    await waitUntil(async () => (await pathOf(orphaned)) === '/VZ Causas/Causas/Sin asignar/Penal/PÉREZ, Luis c Estafa');
    await waitUntil(async () => bin() !== undefined && lawyerFolder().parentId === bin()!.id);
    // Nada se borra: la carpeta del abogado está en la Papelera, y solo ella.
    expect(storage.deletedFolderIds).toEqual([]);
    expect(storage.folders.filter((f) => f.name === 'Sin asignar')).toHaveLength(1);
    // La causa huérfana sigue siendo una causa vigente, con su carpeta y sin abogado (D-143).
    const row = await getPrisma().case.findUniqueOrThrow({ where: { id: orphaned } });
    expect(row).toMatchObject({ responsibleLawyerId: null, active: true });
    expect(row.cloudFolderId).not.toBeNull();
  });

  it('si el abogado conserva una causa terminal, su carpeta queda como historial y las activas igual se mueven', async () => {
    const active = await aCaseWithFolder('GÓMEZ, Ariel c/ Robo');
    const history = await aCaseWithFolder('LÓPEZ, Rosa c/ Daños');
    const archived = await createProceduralState({
      jurisdiction: 'CRIMINAL',
      name: 'Archivada',
      timeLimitDays: 0,
      dayType: 'NONE',
      terminal: true,
    });
    await getPrisma().case.update({ where: { id: history }, data: { currentStateId: archived.stateId } });
    const parentBefore = lawyerFolder().parentId;

    await remove({ reassignments: [{ caseId: active, responsibleLawyerId: gaga.id }] }).expect(204);

    await waitUntil(async () => (await pathOf(active)) === '/VZ Causas/Causas/Gaga, Pablo/Penal/GÓMEZ, Ariel c Robo');
    // Una vez que lo asíncrono terminó (la causa activa ya se movió), la carpeta del abogado sigue donde estaba.
    expect(lawyerFolder().parentId).toBe(parentBefore);
    expect(bin()).toBeUndefined();
    expect(await getPrisma().case.findUniqueOrThrow({ where: { id: history } })).toMatchObject({
      responsibleLawyerId: actors.lawyerId,
    });
  });
});
