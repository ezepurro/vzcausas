import { InvalidCloudFolderError } from '../errors/documents.errors';
import { FolderKey } from '../value-objects/folder-key.vo';

/** State shared by every kind of cloud folder. */
export interface CloudFolderProps {
  cloudFolderId: string;
  name: string;
  url: string;
  /** `null` only for the `MAIN` folder. */
  parentCloudFolderId: string | null;
  createdAt: Date;
}

/**
 * A folder in the study's cloud storage, referenced by the provider's own id
 * (never by name or path). Each of the six kinds of folder is a subclass
 * that adds its own attributes and enforces the shape rules of the
 * `ck_cloud_folders_shape_by_kind` constraint. Instances are built by
 * `CloudFolderFactory`.
 */
export abstract class CloudFolder {
  protected constructor(protected readonly props: CloudFolderProps) {
    CloudFolder.requireText('cloudFolderId', props.cloudFolderId);
    CloudFolder.requireText('name', props.name);
    CloudFolder.requireText('url', props.url);
  }

  get cloudFolderId(): string {
    return this.props.cloudFolderId;
  }

  get name(): string {
    return this.props.name;
  }

  get url(): string {
    return this.props.url;
  }

  get parentCloudFolderId(): string | null {
    return this.props.parentCloudFolderId;
  }

  get createdAt(): Date {
    return this.props.createdAt;
  }

  /** Lawyer the folder belongs to; `null` for kinds that have none. */
  get lawyerId(): number | null {
    return null;
  }

  /** Jurisdiction the folder belongs to; `null` for kinds that have none. */
  get jurisdictionId(): number | null {
    return null;
  }

  /** Natural key that makes this folder unique. */
  abstract get key(): FolderKey;

  protected requireParent(): void {
    CloudFolder.requireText('parentCloudFolderId', this.props.parentCloudFolderId);
  }

  protected static requireText(field: string, value: string | null): void {
    if (typeof value !== 'string' || value.trim().length === 0) {
      throw new InvalidCloudFolderError(`El campo ${field} de la carpeta es obligatorio.`, {
        field,
      });
    }
  }

  protected static requirePositiveId(field: string, value: number | null): number {
    if (value === null || !Number.isInteger(value) || value <= 0) {
      throw new InvalidCloudFolderError(`El campo ${field} de la carpeta no es válido.`, {
        field,
      });
    }
    return value;
  }
}
