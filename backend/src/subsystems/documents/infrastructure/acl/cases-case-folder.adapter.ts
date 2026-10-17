import { Injectable } from '@nestjs/common';
import {
  CaseFolderPort,
  CaseFolderRef,
  CaseFolderRequest,
} from '@subsystems/cases/core/domain/ports/case-folder.port';
import { AssureSpace } from '../../core/application/use-cases/assure-space.use-case';

/**
 * Implements the {@link CaseFolderPort} that `cases` defines, with the
 * {@link AssureSpace} use case. It translates `cases`' request into the
 * command `documents` works with (e.g. the lawyer folder is labelled
 * "LastName, FirstName"), so `cases` never depends on this subsystem's domain.
 */
@Injectable()
export class CasesCaseFolderAdapter implements CaseFolderPort {
  constructor(private readonly assureSpace: AssureSpace) {}

  async ensureCaseFolder(request: CaseFolderRequest): Promise<CaseFolderRef> {
    const result = await this.assureSpace.execute({
      caseId: request.caseId,
      caseCaption: request.caption,
      lawyer: {
        id: request.lawyer.id,
        folderLabel: `${request.lawyer.lastName}, ${request.lawyer.firstName}`,
      },
      jurisdiction: { id: request.jurisdiction.id, folderLabel: request.jurisdiction.label },
    });
    return { cloudFolderId: result.cloudFolderId, url: result.url };
  }
}
