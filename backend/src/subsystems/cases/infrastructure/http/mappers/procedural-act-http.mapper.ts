import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { AuthenticatedUser } from '@shared/domain/authenticated-user';
import { toIsoDate, toIsoWithOffset } from '@shared/infrastructure/http/iso-date';
import {
  RegisterProceduralActCommand,
  RegisterProceduralActResult,
} from '../../../core/application/common/register-procedural-act.interfaces';
import { Deadline } from '../../../core/domain/value-objects/deadline';
import { ProceduralActDeadlineResponseDto, ProceduralActResponseDto } from '../dtos/procedural-act.response.dto';
import { RegisterProceduralActRequestDto } from '../dtos/register-procedural-act.request.dto';

/** Translates between the HTTP shapes of the procedural acts (API contract §3.8) and the use case. */
@Injectable()
export class ProceduralActHttpMapper {
  private readonly timeZone: string;

  constructor(config: ConfigService) {
    this.timeZone = config.getOrThrow<string>('APP_TIMEZONE');
  }

  toCommand(
    caseId: number,
    dto: RegisterProceduralActRequestDto,
    actor: AuthenticatedUser,
  ): RegisterProceduralActCommand {
    return {
      caseId,
      actor,
      proceduralStateId: dto.proceduralStateId,
      customState: dto.customState,
      actDate: dto.actDate,
      notificationDate: dto.notificationDate,
      manualDueDate: dto.manualDueDate,
      notes: dto.notes,
    };
  }

  toResponse(result: RegisterProceduralActResult): ProceduralActResponseDto {
    const { act } = result;
    return {
      id: act.id,
      caseId: act.caseId,
      resultingState: {
        proceduralStateId: act.proceduralStateId,
        name: result.resultingStateName,
        custom: act.isCustom,
      },
      actDate: toIsoDate(act.actDate),
      notificationDate: act.notificationDate && toIsoDate(act.notificationDate),
      notes: act.notes,
      deadline: this.toDeadlineResponse(act.deadline),
      registeredBy: { id: act.registeredByUserId, fullName: result.registeredBy.fullName },
      registeredAt: toIsoWithOffset(act.registeredAt, this.timeZone),
    };
  }

  /** An act that opens no term and has no due date entered by hand has no deadline to show. */
  private toDeadlineResponse(deadline: Deadline): ProceduralActDeadlineResponseDto | null {
    if (!deadline.opensTerm() && deadline.dueDate === null) {
      return null;
    }
    return {
      timeLimitDays: deadline.timeLimitDays,
      dayType: deadline.dayType,
      countsFrom: toIsoDate(deadline.countsFrom),
      computedDueDate: deadline.computedDueDate && toIsoDate(deadline.computedDueDate),
      dueDate: deadline.dueDate && toIsoDate(deadline.dueDate),
      manuallyAdjusted: deadline.manuallyAdjusted,
    };
  }
}
