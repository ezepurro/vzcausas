import { Injectable } from '@nestjs/common';
import { toIsoDate } from '@shared/infrastructure/http/iso-date';
import {
  CaseOpenDeadline,
  OpenDeadlinesPort,
} from '@subsystems/deadlines/core/domain/ports/open-deadlines.port';
import { JurisdictionCode as DeadlinesJurisdictionCode } from '@subsystems/deadlines/core/domain/value-objects/jurisdiction-code';
import { ListOpenDeadlines } from '../../core/application/use-cases/list-open-deadlines.use-case';
import { JurisdictionCode } from '../../core/domain/value-objects/jurisdiction-code';

/**
 * `cases` and `deadlines` each declare their own `JurisdictionCode`, with the
 * same values. Different types to the compiler, so the translation is written
 * out: exhaustive over `cases`' codes, it stops compiling if either side adds
 * or renames one.
 */
const TO_DEADLINES_JURISDICTION: Record<JurisdictionCode, DeadlinesJurisdictionCode> = {
  [JurisdictionCode.CRIMINAL]: DeadlinesJurisdictionCode.CRIMINAL,
  [JurisdictionCode.ADMINISTRATIVE]: DeadlinesJurisdictionCode.ADMINISTRATIVE,
  [JurisdictionCode.AMPARO]: DeadlinesJurisdictionCode.AMPARO,
};

/**
 * Implements the {@link OpenDeadlinesPort} that `deadlines` declares, so its
 * daily check (HU51) reads due dates and business days computed by `cases`'
 * own rules (V-04, CA-51.9). Same shape as `deadlines-prescription-status.adapter.ts`:
 * the consumer owns the port and `cases` adapts (V-05), through a use case
 * because there is a rule on top of the rows (V-07).
 *
 * **Only translates**: the due date to `YYYY-MM-DD` (V-06) and the
 * jurisdiction to `deadlines`' enum. It decides nothing.
 */
@Injectable()
export class DeadlinesOpenDeadlinesAdapter implements OpenDeadlinesPort {
  constructor(private readonly listOpenDeadlines: ListOpenDeadlines) {}

  async findOfActiveCases(today: Date): Promise<CaseOpenDeadline[]> {
    const views = await this.listOpenDeadlines.execute({ today });

    return views.map((view) => ({
      caseId: view.caseId,
      caption: view.caption,
      sacNumber: view.sacNumber,
      jurisdiction: TO_DEADLINES_JURISDICTION[view.jurisdiction],
      responsibleLawyerId: view.responsibleLawyerId,
      origin: view.origin,
      dueDate: toIsoDate(view.dueDate),
      businessDaysRemaining: view.businessDaysRemaining,
      proceduralActId: view.proceduralActId,
    }));
  }
}
