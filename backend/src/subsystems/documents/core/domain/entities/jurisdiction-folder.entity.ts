import { FolderKey } from '../value-objects/folder-key.vo';
import { CloudFolder, CloudFolderProps } from './cloud-folder.entity';

/**
 * A jurisdiction folder, in one of two branches: `Causas/{lawyer}/{jurisdiction}`
 * (with a lawyer) or `Modelos formales/{jurisdiction}` (without one).
 */
export class JurisdictionFolder extends CloudFolder {
  private readonly _lawyerId: number | null;
  private readonly _jurisdictionId: number;

  constructor(
    props: CloudFolderProps & { jurisdictionId: number; lawyerId?: number | null },
  ) {
    super(props);
    this.requireParent();
    this._jurisdictionId = CloudFolder.requirePositiveId('jurisdictionId', props.jurisdictionId);
    this._lawyerId =
      props.lawyerId === null || props.lawyerId === undefined
        ? null
        : CloudFolder.requirePositiveId('lawyerId', props.lawyerId);
  }

  override get lawyerId(): number | null {
    return this._lawyerId;
  }

  override get jurisdictionId(): number {
    return this._jurisdictionId;
  }

  get key(): FolderKey {
    return FolderKey.jurisdiction(this._lawyerId, this._jurisdictionId);
  }
}
