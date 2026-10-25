import { Inject, Injectable } from '@nestjs/common';
import { AuthenticatedUser } from '@shared/domain/authenticated-user';
import { CLOCK, ClockPort } from '@shared/domain/clock.port';
import { InterruptiveAct } from '../../domain/entities/interruptive-act';
import { CaseNotFoundError, PrescriptionNotApplicableError } from '../../domain/errors/case.errors';
import { CASE_REPOSITORY, CaseRepository } from '../../domain/ports/case.repository';
import { INTERRUPTIVE_ACT_REPOSITORY, InterruptiveActRepository } from '../../domain/ports/interruptive-act.repository';
import { InterruptiveActView } from '../../domain/ports/interruptive-act-query.port';
import { PEOPLE_LOOKUP, PeopleLookupPort } from '../../domain/ports/people-lookup.port';
import { JurisdictionCode } from '../../domain/value-objects/jurisdiction-code';

export interface RegisterInterruptiveActCommand {
  caseId: number;
  // Who registers it: only the lawyer in charge of the case (D-50).
  actor: AuthenticatedUser;
  name: string;
  actDate: Date;
  notes?: string | null;
}

// Contract V4 §3.9 words both refusals for this resource, not for procedural acts.
const NOT_RESPONSIBLE_MESSAGE = 'Solo el abogado responsable de la causa puede registrar actos interruptivos.';
const TERMINAL_STATE_MESSAGE = 'La causa se encuentra en un estado terminal y no admite esta operación.';

/**
 * HU31 — registers an interruptive act on a criminal case (contract V4 §3.9).
 *
 * The checks run in the order the contract and HU26 settle: the case exists
 * (and was not given de baja), the caller is its responsible lawyer, the case is
 * criminal, it is not in a terminal state — "Prescripta" included — and only
 * then the data. A refused request writes nothing.
 *
 * Nothing in the case is written: the act's effect on the prescription is
 * computed on every read (V4, D-08), so a single insert is the whole operation
 * and needs no transaction. The state and the deadline of the case do not move
 * (CA-31.6).
 */
@Injectable()
export class RegisterInterruptiveAct {
  constructor(
    @Inject(CASE_REPOSITORY) private readonly cases: CaseRepository,
    @Inject(INTERRUPTIVE_ACT_REPOSITORY) private readonly acts: InterruptiveActRepository,
    @Inject(PEOPLE_LOOKUP) private readonly people: PeopleLookupPort,
    @Inject(CLOCK) private readonly clock: ClockPort,
  ) {}

  async execute(command: RegisterInterruptiveActCommand): Promise<InterruptiveActView> {
    // `findById` does not filter by `active`, so a case given de baja is
    // checked here: through this endpoint it must not exist (§4, Bajas).
    const targetCase = await this.cases.findById(command.caseId);
    if (!targetCase || !targetCase.active) {
      throw new CaseNotFoundError();
    }

    targetCase.assertCanRegisterActs(command.actor, NOT_RESPONSIBLE_MESSAGE);

    if (targetCase.jurisdictionCode !== JurisdictionCode.CRIMINAL) {
      throw new PrescriptionNotApplicableError();
    }

    targetCase.assertAcceptsActs(TERMINAL_STATE_MESSAGE);

    // The actor is the lawyer in charge, so the record exists: a missing one is broken data, not a user error.
    const registeredBy = await this.people.findActiveLawyerById(command.actor.lawyerId!);
    if (!registeredBy) {
      throw new Error(`The lawyer ${command.actor.lawyerId} in charge of the case ${targetCase.id} is not active.`);
    }

    const act = InterruptiveAct.create({
      id: await this.acts.nextId(),
      caseId: targetCase.id,
      name: command.name,
      actDate: command.actDate,
      notes: command.notes,
      registeredByUserId: command.actor.userId,
      registeredByLawyerId: registeredBy.id,
      today: this.clock.today(),
      now: this.clock.now(),
    });
    await this.acts.save(act);

    return { act, registeredBy: { lastName: registeredBy.lastName, firstName: registeredBy.firstName } };
  }
}
