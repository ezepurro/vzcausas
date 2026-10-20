import { FolderKey } from '../value-objects/folder-key.vo';
import { CloudFolder, CloudFolderProps } from './cloud-folder.entity';

/**
 * Root folder of all cases ("Causas"), child of `MAIN`. Case folders are
 * always created below it, never in the account root (CA-39.3).
 */
export class RootCasesFolder extends CloudFolder {

  constructor(props: CloudFolderProps) {
    super(props);
    this.requireParent();
  }

  get key(): FolderKey {
    return FolderKey.rootCases();
  }
}
