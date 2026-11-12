import { getPrisma } from '../harness/test-app';
import type { TemplateJurisdictionFolders } from './cloud-structure.factory';
import type { JurisdictionCode } from './procedural-state.factory';
import { createJurisdiction } from './procedural-state.factory';

/** El orden de los fueros del contrato: el primero lleva el archivo principal del modelo. */
const JURISDICTION_ORDER: JurisdictionCode[] = ['CRIMINAL', 'ADMINISTRATIVE', 'AMPARO'];

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
 *
 * Con `jurisdictionFolders` (`createTemplateJurisdictionFolders`) deja un archivo en
 * la subcarpeta de cada fuero del modelo y su fila en `document_template_files`, como
 * HU34: el principal es el del primer fuero en el orden del contrato. Sin ellas, el
 * archivo queda suelto en `TEMPLATES`, como un modelo anterior a las subcarpetas.
 */
export async function createTemplate(
  storage: UploadableStorage,
  context: { templatesFolderId: string; userId: number; jurisdictionFolders?: TemplateJurisdictionFolders },
  overrides: Partial<CreateTemplateOverrides> & Pick<CreateTemplateOverrides, 'name'>,
) {
  const fileName = `${overrides.name}.docx`;
  const content = Buffer.from(overrides.content ?? `PK ${overrides.name} v1`);
  const upload = (parentId: string) => storage.uploadFile({ parentId, name: fileName, mimeType: DOCX, content });

  const codes = JURISDICTION_ORDER.filter((code) => (overrides.jurisdictions ?? ['CRIMINAL']).includes(code));
  const jurisdictions = await Promise.all(codes.map((code) => createJurisdiction(code)));

  const placements = [];
  if (context.jurisdictionFolders) {
    for (const [index, code] of codes.entries()) {
      const folderId = context.jurisdictionFolders[code].id;
      placements.push({ jurisdictionId: jurisdictions[index].jurisdictionId, cloudFolderId: folderId, cloudFileId: (await upload(folderId)).id });
    }
  }
  const main = placements[0] ?? {
    cloudFolderId: context.templatesFolderId,
    cloudFileId: (await upload(context.templatesFolderId)).id,
  };

  return getPrisma().documentTemplate.create({
    data: {
      name: overrides.name,
      fileName,
      cloudFileId: main.cloudFileId,
      cloudFolderId: main.cloudFolderId,
      copyToNewCases: overrides.copyToNewCases ?? true,
      active: overrides.active ?? true,
      lastVersionByUserId: context.userId,
      jurisdictions: { create: jurisdictions.map(({ jurisdictionId }) => ({ jurisdictionId })) },
      files: { create: placements },
    },
  });
}

/** Borra copias, archivos por fuero, jurisdicciones y modelos, en el orden que piden las claves foráneas. */
export async function clearTemplates(): Promise<void> {
  const prisma = getPrisma();
  await prisma.documentTemplateCopy.deleteMany();
  await prisma.documentTemplateFile.deleteMany();
  await prisma.documentTemplateJurisdiction.deleteMany();
  await prisma.documentTemplate.deleteMany();
}
