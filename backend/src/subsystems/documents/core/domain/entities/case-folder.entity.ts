import { FolderKey } from '../value-objects/folder-key.vo';
import { CloudFolder, CloudFolderProps } from './cloud-folder.entity';

/**
 * The folder of a single case: `Causas/{lawyer}/{jurisdiction}/{caption}`.
 * Its name is the caption alone (CA-39.2).
 *
 * It is identified by `caseId`, which is mandatory: a case folder cannot
 * exist without an existing case. It carries no lawyer or jurisdiction: those
 * belong to the case.
 */
export class CaseFolder extends CloudFolder {
  readonly caseId: number;

  constructor(props: CloudFolderProps & { caseId: number }) {
    super(props);
    this.requireParent();
    this.caseId = CloudFolder.requirePositiveId('caseId', props.caseId);
  }

  get key(): FolderKey {
    return FolderKey.forCase(this.caseId);
  }
}
