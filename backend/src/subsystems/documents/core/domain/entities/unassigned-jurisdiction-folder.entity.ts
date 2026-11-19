import { FolderKey } from '../value-objects/folder-key.vo';
import { CloudFolder, CloudFolderProps } from './cloud-folder.entity';

/**
 * A jurisdiction folder below `Sin asignar`: `Causas/Sin asignar/{jurisdiction}`
 * (D-143). It has no lawyer, like the templates' jurisdiction folders, which is
 * why it is a kind of its own: the two would share a shape and a unique index.
 */
export class UnassignedJurisdictionFolder extends CloudFolder {
  private readonly _jurisdictionId: number;

  constructor(props: CloudFolderProps & { jurisdictionId: number }) {
    super(props);
    this.requireParent();
    this._jurisdictionId = CloudFolder.requirePositiveId('jurisdictionId', props.jurisdictionId);
  }

  override get jurisdictionId(): number {
    return this._jurisdictionId;
  }

  get key(): FolderKey {
    return FolderKey.unassignedJurisdiction(this._jurisdictionId);
  }
}
