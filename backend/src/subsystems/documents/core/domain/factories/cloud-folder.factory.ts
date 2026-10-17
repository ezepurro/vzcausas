import { CaseFolder } from '../entities/case-folder.entity';
import { CloudFolder, CloudFolderProps } from '../entities/cloud-folder.entity';
import { JurisdictionFolder } from '../entities/jurisdiction-folder.entity';
import { LawyerFolder } from '../entities/lawyer-folder.entity';
import { MainFolder } from '../entities/main-folder.entity';
import { RootCasesFolder } from '../entities/root-cases-folder.entity';
import { TemplatesFolder } from '../entities/templates-folder.entity';
import { InvalidCloudFolderError } from '../errors/documents.errors';
import { CloudFolderKind } from '../value-objects/cloud-folder-kind';

/**
 * Flat description of a folder: what a new one is created from and what a
 * persisted row is read as. Attributes that do not apply to a kind are `null`.
 */
export interface CloudFolderData extends CloudFolderProps {
  kind: CloudFolderKind;
  lawyerId?: number | null;
  jurisdictionId?: number | null;
  /** Mandatory for `CASE`: a case folder cannot exist without its case. */
  caseId?: number | null;
}

/**
 * The only place that picks the subclass of {@link CloudFolder} for a
 * {@link CloudFolderKind}. The `switch` is exhaustive: adding a kind without
 * handling it here does not compile.
 */
export class CloudFolderFactory {
  /**
   * Builds the folder of the given kind.
   *
   * @throws {InvalidCloudFolderError} if the data breaks the kind's shape rules.
   */
  static create(data: CloudFolderData): CloudFolder {
    const base: CloudFolderProps = {
      cloudFolderId: data.cloudFolderId,
      name: data.name,
      url: data.url,
      parentCloudFolderId: data.parentCloudFolderId,
      createdAt: data.createdAt,
    };

    switch (data.kind) {
      case 'MAIN':
        return new MainFolder(base);
      case 'TEMPLATES':
        return new TemplatesFolder(base);
      case 'ROOT_CASES':
        return new RootCasesFolder(base);
      case 'LAWYER':
        return new LawyerFolder({ ...base, lawyerId: data.lawyerId as number });
      case 'JURISDICTION':
        return new JurisdictionFolder({
          ...base,
          jurisdictionId: data.jurisdictionId as number,
          lawyerId: data.lawyerId ?? null,
        });
      case 'CASE':
        return new CaseFolder({ ...base, caseId: data.caseId as number });
      default:
        return CloudFolderFactory.unreachable(data.kind);
    }
  }

  /** Rebuilds a persisted folder. Same rules as {@link create}: the shape is cheap to re-check. */
  static hydrate(data: CloudFolderData): CloudFolder {
    return CloudFolderFactory.create(data);
  }

  private static unreachable(kind: never): never {
    throw new InvalidCloudFolderError(`Tipo de carpeta desconocido: ${String(kind)}.`);
  }
}
