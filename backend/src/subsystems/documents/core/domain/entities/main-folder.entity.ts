import { InvalidCloudFolderError } from '../errors/documents.errors';
import { FolderKey } from '../value-objects/folder-key.vo';
import { CloudFolder, CloudFolderProps } from './cloud-folder.entity';

/** The study's root folder ("VZ Causas"). It is the only one without a parent. */
export class MainFolder extends CloudFolder {

  constructor(props: CloudFolderProps) {
    super(props);
    if (props.parentCloudFolderId !== null) {
      throw new InvalidCloudFolderError('La carpeta MAIN no puede tener carpeta padre.');
    }
  }

  get key(): FolderKey {
    return FolderKey.main();
  }
}
