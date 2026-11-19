import { INestApplication } from '@nestjs/common';

import { getPrisma, startTestApp, stopTestApp } from '../../shared/harness/test-app';
import { clearCloudFolders } from '../../shared/factories/cloud-structure.factory';
import {
  ProceduralActScenario,
  resetProceduralActData,
  setUpProceduralActScenario,
} from '../../shared/factories/procedural-act-scenario';

/*
 * HU15 · Carpetas de las causas huérfanas (D-143): lo que solo la base puede probar.
 *
 * `Causas/Sin asignar` (UNASSIGNED) y el fuero debajo de ella (UNASSIGNED_JURISDICTION)
 * son tipos propios de `cloud_folders`: sin ellos, el fuero de `Sin asignar` chocaría con
 * el de los modelos formales (misma forma, sin abogado). Los índices únicos y el CHECK
 * `ck_cloud_folders_shape_by_kind` se prueban con la base, sin pasar por Drive.
 */
describe('cloud_folders: carpetas de Sin asignar', () => {
  let app: INestApplication;
  let s: ProceduralActScenario;
  let jurisdictionId: number;

  const CONSTRAINT = /ck_cloud_folders_shape_by_kind|check constraint|23514/i;
  const UNIQUE = /unique|duplicate|23505/i;
  let seq = 0;

  const folder = (kind: string, overrides: Record<string, unknown> = {}) => {
    seq += 1;
    return getPrisma().cloudFolder.create({
      data: {
        cloudFolderId: `unassigned-spec-${seq}`,
        kind: kind as never,
        name: `Carpeta ${seq}`,
        url: `https://storage.invalid/${seq}`,
        ...overrides,
      },
    });
  };

  /** Causas > Sin asignar: la raíz que cuelga de MAIN. */
  async function aRootCases() {
    const main = await folder('MAIN');
    return folder('ROOT_CASES', { parentCloudFolderId: main.cloudFolderId });
  }

  beforeAll(async () => {
    app = await startTestApp();
  });

  afterAll(async () => {
    await clearCloudFolders();
    await resetProceduralActData();
    await stopTestApp();
  });

  beforeEach(async () => {
    await clearCloudFolders();
    s = await setUpProceduralActScenario();
    jurisdictionId = s.caseRow.jurisdictionId;
  });

  it('acepta Sin asignar, su fuero y la carpeta de una causa huérfana, sin abogado', async () => {
    const root = await aRootCases();
    const unassigned = await folder('UNASSIGNED', { parentCloudFolderId: root.cloudFolderId });
    const fuero = await folder('UNASSIGNED_JURISDICTION', {
      parentCloudFolderId: unassigned.cloudFolderId,
      jurisdictionId,
    });

    const orphanCase = await folder('CASE', { parentCloudFolderId: fuero.cloudFolderId, jurisdictionId });

    expect(orphanCase.lawyerId).toBeNull();
  });

  it('solo hay una carpeta Sin asignar', async () => {
    const root = await aRootCases();
    await folder('UNASSIGNED', { parentCloudFolderId: root.cloudFolderId });

    await expect(folder('UNASSIGNED', { parentCloudFolderId: root.cloudFolderId })).rejects.toThrow(UNIQUE);
  });

  it('solo hay una carpeta de fuero debajo de Sin asignar por fuero', async () => {
    const root = await aRootCases();
    const unassigned = await folder('UNASSIGNED', { parentCloudFolderId: root.cloudFolderId });
    await folder('UNASSIGNED_JURISDICTION', { parentCloudFolderId: unassigned.cloudFolderId, jurisdictionId });

    await expect(
      folder('UNASSIGNED_JURISDICTION', { parentCloudFolderId: unassigned.cloudFolderId, jurisdictionId }),
    ).rejects.toThrow(UNIQUE);
  });

  it('la carpeta de fuero de Sin asignar no choca con la de los modelos formales (misma forma, sin abogado)', async () => {
    const root = await aRootCases();
    const unassigned = await folder('UNASSIGNED', { parentCloudFolderId: root.cloudFolderId });
    const templates = await folder('TEMPLATES', { parentCloudFolderId: (await getMain()).cloudFolderId });
    await folder('JURISDICTION', { parentCloudFolderId: templates.cloudFolderId, jurisdictionId });

    await expect(
      folder('UNASSIGNED_JURISDICTION', { parentCloudFolderId: unassigned.cloudFolderId, jurisdictionId }),
    ).resolves.toBeDefined();
  });

  it('rechaza un abogado en Sin asignar o en su fuero, y un fuero sin fuero', async () => {
    const root = await aRootCases();
    const unassigned = await folder('UNASSIGNED', { parentCloudFolderId: root.cloudFolderId });

    await expect(folder('UNASSIGNED', { parentCloudFolderId: root.cloudFolderId, lawyerId: s.lawyer.id })).rejects.toThrow(
      CONSTRAINT,
    );
    await expect(
      folder('UNASSIGNED_JURISDICTION', {
        parentCloudFolderId: unassigned.cloudFolderId,
        jurisdictionId,
        lawyerId: s.lawyer.id,
      }),
    ).rejects.toThrow(CONSTRAINT);
    await expect(folder('UNASSIGNED_JURISDICTION', { parentCloudFolderId: unassigned.cloudFolderId })).rejects.toThrow(
      CONSTRAINT,
    );
  });

  async function getMain() {
    return getPrisma().cloudFolder.findFirstOrThrow({ where: { kind: 'MAIN' } });
  }
});
