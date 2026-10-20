import { FolderKey } from '../value-objects/folder-key.vo';
import { CloudFolder, CloudFolderProps } from './cloud-folder.entity';

/** Folder of the formal templates ("Modelos formales"), child of `MAIN`. */
export class TemplatesFolder extends CloudFolder {

  constructor(props: CloudFolderProps) {
    super(props);
    this.requireParent();
  }

  get key(): FolderKey {
    return FolderKey.templates();
  }
}
