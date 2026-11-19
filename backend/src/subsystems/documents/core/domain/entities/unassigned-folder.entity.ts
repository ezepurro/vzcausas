import { FolderKey } from '../value-objects/folder-key.vo';
import { CloudFolder, CloudFolderProps } from './cloud-folder.entity';

/**
 * `Causas/Sin asignar`, child of `ROOT_CASES` (D-143). It holds the folders of
 * the orphaned cases, which have no lawyer. It is not a lawyer's folder: there
 * is no lawyer behind it, so it is never renamed or moved by one.
 */
export class UnassignedFolder extends CloudFolder {
  constructor(props: CloudFolderProps) {
    super(props);
    this.requireParent();
  }

  get key(): FolderKey {
    return FolderKey.unassigned();
  }
}
