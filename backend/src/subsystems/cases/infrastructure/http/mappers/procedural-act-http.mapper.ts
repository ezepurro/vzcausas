import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { AuthenticatedUser } from '@shared/domain/authenticated-user';
import { ValidationError } from '@shared/domain/domain-error';
import { toIsoDate, toIsoWithOffset } from '@shared/infrastructure/http/iso-date';
import {
  DeadlinePreviewResult,
  PreviewProceduralActDeadlineQuery,
  RegisterProceduralActCommand,
} from '../../../core/application/use-cases/procedural-act/register-procedural-act.interfaces';
import { ProceduralActView } from '../../../core/domain/ports/procedural-act/procedural-act.repository';
import { Deadline } from '../../../core/domain/value-objects/deadline/deadline.vo';
import { DeadlinePreviewQueryDto } from '../dtos/procedural-act/deadline-preview.query.dto';
import { DeadlinePreviewResponseDto } from '../dtos/procedural-act/deadline-preview.response.dto';
import { ProceduralActDeadlineResponseDto, ProceduralActResponseDto } from '../dtos/procedural-act/procedural-act.response.dto';
import { RegisterProceduralActRequestDto } from '../dtos/procedural-act/register-procedural-act.request.dto';
import { UpdateProceduralActRequestDto } from '../dtos/procedural-act/update-procedural-act.request.dto';
import { UpdateProceduralActCommand } from '../../../core/application/use-cases/procedural-act/update-procedural-act.use-case';

const CIVIL_DATE = /^(\d{4})-(\d{2})-(\d{2})$/;

/** `YYYY-MM-DD` read as a civil date (midnight UTC), or `null` if it is not a real date. */
function parseCivilDate(raw: string): Date | null {
  if (!CIVIL_DATE.test(raw)) {
    return null;
  }
  const date = new Date(`${raw}T00:00:00.000Z`);
  return Number.isNaN(date.getTime()) || date.toISOString().slice(0, 10) !== raw ? null : date;
}

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

  /**
   * The query string, as text, to the question the use case answers. What the
   * contract calls `INVALID_REQUEST` is reported here for the values that cannot even be read.
   * @throws ValidationError `INVALID_REQUEST`
   */
  toPreviewQuery(
    caseId: number,
    query: DeadlinePreviewQueryDto,
    actor: AuthenticatedUser,
  ): PreviewProceduralActDeadlineQuery {
    const details: Record<string, string> = {};

    let proceduralStateId: number | null = null;
    if (query.proceduralStateId === undefined) {
      details.proceduralStateId = 'Es obligatorio.';
    } else if (/^[1-9]\d*$/.test(query.proceduralStateId)) {
      proceduralStateId = Number(query.proceduralStateId);
    } else {
      details.proceduralStateId = 'Debe ser un número entero válido.';
    }

    let actDate: Date | null = null;
    if (query.actDate === undefined) {
      details.actDate = 'Es obligatoria.';
    } else {
      actDate = parseCivilDate(query.actDate);
      if (actDate === null) {
        details.actDate = 'Debe ser una fecha válida (AAAA-MM-DD).';
      }
    }

    let notificationDate: Date | null = null;
    if (query.notificationDate !== undefined) {
      notificationDate = parseCivilDate(query.notificationDate);
      if (notificationDate === null) {
        details.notificationDate = 'Debe ser una fecha válida (AAAA-MM-DD).';
      }
    }

    if (Object.keys(details).length > 0) {
      throw new ValidationError('INVALID_REQUEST', 'Parámetros de query inválidos.', details);
    }
    return { caseId, actor, proceduralStateId, actDate: actDate!, notificationDate };
  }

  toPreviewResponse(result: DeadlinePreviewResult): DeadlinePreviewResponseDto {
    return {
      proceduralStateId: result.proceduralStateId,
      timeLimitDays: result.timeLimitDays,
      dayType: result.dayType,
      countsFrom: toIsoDate(result.countsFrom),
      dueDate: result.dueDate && toIsoDate(result.dueDate),
      businessDaysRemaining: result.businessDaysRemaining,
    };
  }

  /**
   * One act, for the `POST` that registers it and for the `GET`s that read it
   * (HU27). Takes a {@link ProceduralActView}, which `RegisterProceduralActResult`
   * satisfies too: one function for both, so the resource cannot drift.
   */
  toResponse(result: ProceduralActView): ProceduralActResponseDto {
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
      registeredBy: {
        id: act.registeredByUserId,
        lastName: result.registeredBy.lastName,
        firstName: result.registeredBy.firstName,
      },
      registeredAt: toIsoWithOffset(act.registeredAt, this.timeZone),
      lastModifiedBy:
        act.lastModifiedByUserId === null || !result.lastModifiedBy
          ? null
          : { id: act.lastModifiedByUserId, ...result.lastModifiedBy },
      lastModifiedAt: act.lastModifiedAt && toIsoWithOffset(act.lastModifiedAt, this.timeZone),
    };
  }

  /**
   * The body of the `PATCH` (HU28) to the command. Only what was sent travels: a
   * field left out stays `undefined` and does not change, `null` empties it.
   */
  toUpdateCommand(
    caseId: number,
    actId: number,
    dto: UpdateProceduralActRequestDto,
    actor: AuthenticatedUser,
  ): UpdateProceduralActCommand {
    return {
      caseId,
      actId,
      actor,
      changes: {
        proceduralStateId: dto.proceduralStateId,
        customState: dto.customState,
        actDate: dto.actDate,
        notificationDate: dto.notificationDate,
        manualDueDate: dto.manualDueDate,
        notes: dto.notes,
      },
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
      manualTimeLimitDays: deadline.manualTimeLimitDays,
    };
  }
}
