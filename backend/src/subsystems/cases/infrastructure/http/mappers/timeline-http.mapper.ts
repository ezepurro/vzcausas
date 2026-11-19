import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { toIsoDate, toIsoWithOffset } from '@shared/infrastructure/http/iso-date';
import { TimelineEntry } from '../../../core/application/use-cases/case/get-case-timeline.use-case';
import { ResponsibleChangeView } from '../../../core/domain/ports/case/case-timeline-query.port';
import { ResponsibleLawyerChangeResponseDto, TimelineEntryResponseDto } from '../dtos/case/timeline.response.dto';
import { InterruptiveActHttpMapper } from './interruptive-act-http.mapper';
import { toPrescriptionDeclarationResponse } from './prescription-declaration-http.mapper';
import { ProceduralActHttpMapper } from './procedural-act-http.mapper';

/**
 * Translates the line of life into the contract's shape (V4,
 * `GET /cases/{caseId}/timeline`).
 *
 * The acts go out through the mappers of their own endpoints, so an entry is
 * the very resource `GET /procedural-acts` or `GET /interruptive-acts` would
 * return — not a look-alike that could drift.
 */
@Injectable()
export class TimelineHttpMapper {
  private readonly timeZone: string;

  constructor(
    config: ConfigService,
    private readonly proceduralActs: ProceduralActHttpMapper,
    private readonly interruptiveActs: InterruptiveActHttpMapper,
  ) {
    this.timeZone = config.getOrThrow<string>('APP_TIMEZONE');
  }

  toResponse(entries: TimelineEntry[]): TimelineEntryResponseDto[] {
    return entries.map((entry) => this.toEntry(entry));
  }

  private toEntry(entry: TimelineEntry): TimelineEntryResponseDto {
    const date = toIsoDate(entry.date);
    switch (entry.type) {
      case 'PROCEDURAL_ACT':
        return {
          type: entry.type,
          date,
          current: entry.current,
          proceduralAct: this.proceduralActs.toResponse(entry.proceduralAct),
        };
      case 'INTERRUPTIVE_ACT':
        return {
          type: entry.type,
          date,
          governsPrescription: entry.governsPrescription,
          interruptiveAct: this.interruptiveActs.toResponse(entry.interruptiveAct),
        };
      case 'QUALIFICATION_PRESCRIPTION_DECLARATION':
        return {
          type: entry.type,
          date,
          legalQualification: entry.legalQualification,
          prescriptionDeclaration: toPrescriptionDeclarationResponse(entry.prescriptionDeclaration, this.timeZone),
        };
      case 'PRESCRIPTION_DECLARATION':
        return {
          type: entry.type,
          date,
          prescriptionDeclaration: toPrescriptionDeclarationResponse(entry.prescriptionDeclaration, this.timeZone),
        };
      case 'RESPONSIBLE_LAWYER_CHANGE':
        return {
          type: entry.type,
          date,
          responsibleLawyerChange: this.toResponsibleChange(entry.responsibleLawyerChange),
        };
    }
  }

  /** D-147: the keys and their order are the contract's. */
  private toResponsibleChange(view: ResponsibleChangeView): ResponsibleLawyerChangeResponseDto {
    return {
      id: view.id,
      caseId: view.change.caseId,
      kind: view.change.kind,
      previousLawyer: view.previousLawyer,
      newLawyer: view.newLawyer,
      origin: view.change.origin,
      changedBy: view.changedBy,
      changedAt: toIsoWithOffset(view.change.changedAt, this.timeZone),
    };
  }
}
