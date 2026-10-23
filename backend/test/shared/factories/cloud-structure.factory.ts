import { getPrisma } from '../harness/test-app';

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
