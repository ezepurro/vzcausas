import { Injectable } from '@nestjs/common';
import { toIsoDate } from '@shared/infrastructure/http/iso-date';
import {
  CasePrescriptionStatus,
  PrescriptionStatusPort,
} from '@subsystems/deadlines/core/domain/ports/prescription-status.port';
import { ListActivePrescriptions } from '../../core/application/use-cases/list-active-prescriptions.use-case';

/**
 * Implements the {@link PrescriptionStatusPort} that `deadlines` declares, so
 * its daily check (HU52) reads prescription computed by `cases`' own rule
 * instead of a copy of it (V-04, `IMPLEMENTACION_DETECCION.md`).
 *
 * Same direction as `legal-parameters-active-cases-counter.adapter.ts`: the
 * consumer owns the port and `cases`, which owns the rule, adapts (V-05).
 * Unlike that one, this goes through a use case, {@link ListActivePrescriptions},
 * because here there is a rule to apply on top of the rows (V-07).
 *
 * **Only translates** (anti-corruption layer): from `cases`' summary, with
 * `Date`s, `startsOn` and the percentage, to the fields `deadlines` asked
 * for, with the expiry as `YYYY-MM-DD` (V-06). It decides nothing: which cases
 * get a notice is `deadlines`'.
 *
 * `toIsoDate` lives under `shared/infrastructure/http` because its other users
 * are HTTP mappers, but it is just the contract's civil-date format; reusing
 * it keeps one definition of how a civil date is written.
 */
@Injectable()
export class DeadlinesPrescriptionStatusAdapter implements PrescriptionStatusPort {
  constructor(private readonly listActivePrescriptions: ListActivePrescriptions) {}

  async findOfActiveCriminalCases(today: Date): Promise<CasePrescriptionStatus[]> {
    const views = await this.listActivePrescriptions.execute({ today });

    return views.map((view) => ({
      caseId: view.caseId,
      caption: view.caption,
      sacNumber: view.sacNumber,
      responsibleLawyerId: view.responsibleLawyerId,
      legalQualificationName: view.prescription.legalQualificationName,
      expiresOn: toIsoDate(view.prescription.expiresOn),
      alert: view.prescription.alert,
      expired: view.prescription.expired,
      daysRemaining: view.prescription.remainingDays,
    }));
  }
}
