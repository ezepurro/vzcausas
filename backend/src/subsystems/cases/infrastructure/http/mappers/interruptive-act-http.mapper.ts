import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { toIsoDate, toIsoWithOffset } from '@shared/infrastructure/http/iso-date';
import { InterruptiveActView } from '../../../core/domain/ports/interruptive-act-query.port';
import { InterruptiveActResponseDto } from '../dtos/interruptive-act.response.dto';

/**
 * Translates an interruptive act into the contract's resource (V4 §3.9). One
 * function for the `POST` and the `GET`, so the two cannot drift.
 */
@Injectable()
export class InterruptiveActHttpMapper {
  private readonly timeZone: string;

  constructor(config: ConfigService) {
    this.timeZone = config.getOrThrow<string>('APP_TIMEZONE');
  }

  toResponse(view: InterruptiveActView): InterruptiveActResponseDto {
    const { act } = view;
    return {
      id: act.id,
      caseId: act.caseId,
      name: act.name,
      actDate: toIsoDate(act.actDate),
      notes: act.notes,
      // The user who registered it; the names come from their lawyer record, as in procedural acts.
      registeredBy: {
        id: act.registeredByUserId,
        lastName: view.registeredBy.lastName,
        firstName: view.registeredBy.firstName,
      },
      registeredAt: toIsoWithOffset(act.registeredAt, this.timeZone),
    };
  }
}
