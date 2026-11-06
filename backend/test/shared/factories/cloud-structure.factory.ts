import { getPrisma } from '../harness/test-app';
import type { JurisdictionCode } from './procedural-state.factory';
import { createJurisdiction } from './procedural-state.factory';

/** Lo único que hace falta de un almacenamiento para sembrarle la estructura base. */
export interface SeedableStorage {
  seed(parentId: string | null, name: string): { id: string; url: string };
}

/**
 * Factory de la estructura de carpetas del estudio.
 *
 * - `createCloudStructure()` → deja `VZ Causas` (MAIN), `Modelos formales`
 *                              (TEMPLATES) y `Causas` (ROOT_CASES) en el
 *                              almacenamiento en memoria y en `cloud_folders`,
 *                              como lo hace `documents:setup-storage` en un
 *                              entorno real.
 * - `clearCloudFolders()`    → la borra, hijas antes que padres.
 *
 * Sin esta estructura, pedir la carpeta de una causa la arma (`SetupCloudStorage`);
 * los tests la siembran para controlar los ids y no pagar ese armado.
 */
export async function createCloudStructure(storage: SeedableStorage) {
  const prisma = getPrisma();
  const main = storage.seed(null, 'VZ Causas');
  const templates = storage.seed(main.id, 'Modelos formales');
  const rootCases = storage.seed(main.id, 'Causas');

  await prisma.cloudFolder.create({
    data: { cloudFolderId: main.id, kind: 'MAIN', name: 'VZ Causas', url: main.url },
  });
  await prisma.cloudFolder.create({
    data: {
      cloudFolderId: templates.id,
      kind: 'TEMPLATES',
      name: 'Modelos formales',
      url: templates.url,
      parentCloudFolderId: main.id,
    },
  });
  await prisma.cloudFolder.create({
    data: {
      cloudFolderId: rootCases.id,
      kind: 'ROOT_CASES',
      name: 'Causas',
      url: rootCases.url,
      parentCloudFolderId: main.id,
    },
  });
  return { main, templates, rootCases };
}

/** Rótulo de la subcarpeta de cada fuero debajo de "Modelos formales" (ADR-003 §2.2). */
const TEMPLATE_FOLDER_LABEL = { CRIMINAL: 'Penal', ADMINISTRATIVE: 'Administrativo', AMPARO: 'Amparo' } as const;

/** Carpeta de cada fuero debajo de "Modelos formales", por el código del fuero. */
export type TemplateJurisdictionFolders = Record<JurisdictionCode, { id: string; url: string }>;

/**
 * Siembra las tres subcarpetas `Modelos formales/{fuero}` (JURISDICTION sin abogado)
 * en el almacenamiento y en `cloud_folders`, como las deja `SetupCloudStorage`. Crea
 * los tres fueros si faltan. `createCloudStructure` no las siembra: solo las suites de
 * modelos las necesitan, y las de causas esperan el árbol sin ellas.
 */
export async function createTemplateJurisdictionFolders(
  storage: SeedableStorage,
  templatesFolderId: string,
): Promise<TemplateJurisdictionFolders> {
  const prisma = getPrisma();
  const folders = {} as TemplateJurisdictionFolders;
  for (const code of ['CRIMINAL', 'ADMINISTRATIVE', 'AMPARO'] as const) {
    const { jurisdictionId } = await createJurisdiction(code);
    const folder = storage.seed(templatesFolderId, TEMPLATE_FOLDER_LABEL[code]);
    await prisma.cloudFolder.create({
      data: {
        cloudFolderId: folder.id,
        kind: 'JURISDICTION',
        name: TEMPLATE_FOLDER_LABEL[code],
        url: folder.url,
        parentCloudFolderId: templatesFolderId,
        jurisdictionId,
      },
    });
    folders[code] = folder;
  }
  return folders;
}

/**
 * Borra todas las carpetas. Las causas apuntan a su carpeta con `Restrict`, así
 * que primero se suelta ese vínculo, y después se borra de las hojas a la raíz.
 */
export async function clearCloudFolders(): Promise<void> {
  const prisma = getPrisma();
  await prisma.case.updateMany({ data: { cloudFolderId: null, folderStatus: null } });
  for (const kind of ['CASE', 'JURISDICTION', 'LAWYER', 'TEMPLATES', 'ROOT_CASES', 'MAIN'] as const) {
    await prisma.cloudFolder.deleteMany({ where: { kind } });
  }
}
