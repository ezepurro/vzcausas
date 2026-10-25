import { getPrisma } from '../harness/test-app';
import type { JurisdictionCode } from './procedural-state.factory';
import { createJurisdiction } from './procedural-state.factory';

/** Lo que hace falta de un almacenamiento para dejarle el archivo de un modelo. */
export interface UploadableStorage {
  uploadFile(upload: {
    parentId: string;
    name: string;
    mimeType: string;
    content: Buffer;
  }): Promise<{ id: string; url: string }>;
}

export interface CreateTemplateOverrides {
  name: string;
  jurisdictions: JurisdictionCode[];
  copyToNewCases: boolean;
  active: boolean;
  content: string;
}

const DOCX = 'application/vnd.openxmlformats-officedocument.wordprocessingml.document';

/**
 * PERSISTE un modelo formal con su archivo en el almacenamiento, como lo deja
 * HU34 pero sin pasar por HTTP. Por defecto: penal, "copiar en las causas
 * nuevas" marcado, vigente. El archivo se llama `{name}.docx`.
 *
 * Hace falta la carpeta `TEMPLATES` (la deja `createCloudStructure`) y un
 * usuario que figure como autor de la última versión.
 */
export async function createTemplate(
  storage: UploadableStorage,
  context: { templatesFolderId: string; userId: number },
  overrides: Partial<CreateTemplateOverrides> & Pick<CreateTemplateOverrides, 'name'>,
) {
  const fileName = `${overrides.name}.docx`;
  const file = await storage.uploadFile({
    parentId: context.templatesFolderId,
    name: fileName,
    mimeType: DOCX,
    content: Buffer.from(overrides.content ?? `PK ${overrides.name} v1`),
  });
  const jurisdictions = await Promise.all((overrides.jurisdictions ?? ['CRIMINAL']).map((code) => createJurisdiction(code)));

  return getPrisma().documentTemplate.create({
    data: {
      name: overrides.name,
      fileName,
      cloudFileId: file.id,
      cloudFolderId: context.templatesFolderId,
      copyToNewCases: overrides.copyToNewCases ?? true,
      active: overrides.active ?? true,
      lastVersionByUserId: context.userId,
      jurisdictions: { create: jurisdictions.map(({ jurisdictionId }) => ({ jurisdictionId })) },
    },
  });
}

/** Borra copias, jurisdicciones y modelos, en el orden que piden las claves foráneas. */
export async function clearTemplates(): Promise<void> {
  const prisma = getPrisma();
  await prisma.documentTemplateCopy.deleteMany();
  await prisma.documentTemplateJurisdiction.deleteMany();
  await prisma.documentTemplate.deleteMany();
}
