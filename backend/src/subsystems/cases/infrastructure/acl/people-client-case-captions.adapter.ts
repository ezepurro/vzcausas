import { Injectable } from '@nestjs/common';
import {
  CaptionsFollowUp,
  ClientCaseCaptionsPort,
  ClientRenamed,
} from '@subsystems/people/core/domain/ports/client-case-captions.port';
import { FollowClientRename } from '../../core/application/use-cases/case/follow-client-rename.use-case';

/**
 * Implements the {@link ClientCaseCaptionsPort} that `people` declares, so
 * `PATCH /clients/{clientId}` can carry a new client name into the captions of
 * its cases (HU10, D-121) without `people` knowing what a caption is.
 *
 * A pass-through to {@link FollowClientRename}: the rule — which captions
 * change and how — lives in `cases`. It translates the port's plain types and
 * nothing else; `people` gets back only the ids it has to hand to `announce`.
 */
@Injectable()
export class PeopleClientCaseCaptionsAdapter implements ClientCaseCaptionsPort {
  constructor(private readonly followClientRename: FollowClientRename) {}

  async followRename(renamed: ClientRenamed): Promise<CaptionsFollowUp> {
    const renamedCaseIds = await this.followClientRename.execute({
      clientId: renamed.clientId,
      previous: renamed.previous,
      next: renamed.next,
      actorUserId: renamed.actorUserId,
      occurredAt: renamed.occurredAt,
    });
    return { renamedCaseIds };
  }

  async announce(followUp: CaptionsFollowUp): Promise<void> {
    await this.followClientRename.announce(followUp.renamedCaseIds);
  }
}
