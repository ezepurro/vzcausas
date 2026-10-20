import { FolderKey } from '../value-objects/folder-key.vo';
import { CloudFolder, CloudFolderProps } from './cloud-folder.entity';

/** `Causas/{lawyer}`: groups the jurisdictions of one responsible lawyer. */
export class LawyerFolder extends CloudFolder {
  private readonly _lawyerId: number;

  constructor(props: CloudFolderProps & { lawyerId: number }) {
    super(props);
    this.requireParent();
    this._lawyerId = CloudFolder.requirePositiveId('lawyerId', props.lawyerId);
  }

  override get lawyerId(): number {
    return this._lawyerId;
  }

  get key(): FolderKey {
    return FolderKey.lawyer(this._lawyerId);
  }
}
