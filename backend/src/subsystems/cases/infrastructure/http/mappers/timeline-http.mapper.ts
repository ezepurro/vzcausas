import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { toIsoDate } from '@shared/infrastructure/http/iso-date';
import { TimelineEntry } from '../../../core/application/use-cases/case/get-case-timeline.use-case';
import { TimelineEntryResponseDto } from '../dtos/case/timeline.response.dto';
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
    }
  }
}
