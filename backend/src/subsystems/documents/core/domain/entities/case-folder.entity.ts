import { FolderKey } from '../value-objects/folder-key.vo';
import { CloudFolder, CloudFolderProps } from './cloud-folder.entity';

/**
 * The folder of a single case: `Causas/{lawyer}/{jurisdiction}/{caption}`.
 * Its name is the caption alone (CA-39.2).
 *
 * It is identified by `caseId`, which is mandatory: a case folder cannot
 * exist without an existing case. It also carries the lawyer and the
 * jurisdiction, as `ck_cloud_folders_shape_by_kind` requires them on every
 * `CASE` row; keeping them in the entity avoids code and database disagreeing.
 */
export class CaseFolder extends CloudFolder {
  private _lawyerId: number;
  private readonly _jurisdictionId: number;
  readonly caseId: number;

  constructor(
    props: CloudFolderProps & {
      caseId: number;
      lawyerId: number;
      jurisdictionId: number;
    },
  ) {
    super(props);
    this.requireParent();
    this.caseId = CloudFolder.requirePositiveId('caseId', props.caseId);
    this._lawyerId = CloudFolder.requirePositiveId('lawyerId', props.lawyerId);
    this._jurisdictionId = CloudFolder.requirePositiveId('jurisdictionId', props.jurisdictionId);
  }

  override get lawyerId(): number {
    return this._lawyerId;
  }

  override get jurisdictionId(): number {
    return this._jurisdictionId;
  }

  /**
   * Moves the folder under another jurisdiction folder, that of the new
   * responsible lawyer (HU19, CA-19.9). The parent and the lawyer change
   * together, as `ck_cloud_folders_shape_by_kind` requires. The jurisdiction
   * does not change (D-95), so the new parent must be of the same one.
   *
   * @throws {InvalidCloudFolderError} if the parent or the lawyer are not valid.
   */
  moveUnder(parentCloudFolderId: string, lawyerId: number): void {
    CloudFolder.requireText('parentCloudFolderId', parentCloudFolderId);
    this._lawyerId = CloudFolder.requirePositiveId('lawyerId', lawyerId);
    this.props.parentCloudFolderId = parentCloudFolderId;
  }

  get key(): FolderKey {
    return FolderKey.forCase(this.caseId);
  }
}
