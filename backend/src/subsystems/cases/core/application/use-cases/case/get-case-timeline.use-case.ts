import { Inject, Injectable } from '@nestjs/common';
import { CLOCK, ClockPort } from '@shared/domain/clock.port';
import { CaseNotFoundError } from '../../../domain/errors/case.errors';
import {
  CASE_TIMELINE_QUERY,
  CaseTimelineQueryPort,
  PrescriptionDeclarationView,
} from '../../../domain/ports/case/case-timeline-query.port';
import { InterruptiveActView } from '../../../domain/ports/interruptive-act/interruptive-act.repository';
import { ProceduralActView } from '../../../domain/ports/procedural-act/procedural-act.repository';
import { summarizePrescription } from '../../../domain/prescription';

/**
 * One entry of the line of life (contract V4, `GET /cases/{caseId}/timeline`).
 *
 * `registeredAt` is not part of the contract's entry: it is kept here only to
 * break ties between entries of the same date (the last registered first).
 */
export type TimelineEntry =
  | {
      type: 'PROCEDURAL_ACT';
      date: Date;
      registeredAt: Date;
      /** The act that took the case to its current state: its deadline is the open one (CA-27.4). */
      current: boolean;
      proceduralAct: ProceduralActView;
    }
  | {
      type: 'INTERRUPTIVE_ACT';
      date: Date;
      registeredAt: Date;
      /**
       * The act the `prescription` of the case counts from: the one that sets its
       * `lastInterruptiveActDate` (CA-27.11, D-113). Not always the most recent:
       * an act after the term of an offense was met does not restart it.
       */
      governsPrescription: boolean;
      interruptiveAct: InterruptiveActView;
    }
  | {
      /** D-113: one legal qualification declared prescribed. */
      type: 'QUALIFICATION_PRESCRIPTION_DECLARATION';
      date: Date;
      registeredAt: Date;
      legalQualification: { id: number; name: string };
      prescriptionDeclaration: PrescriptionDeclarationView;
    }
  | {
      type: 'PRESCRIPTION_DECLARATION';
      date: Date;
      registeredAt: Date;
      prescriptionDeclaration: PrescriptionDeclarationView;
    };

/**
 * HU27 — the line of life of a case: its procedural acts, its interruptive
 * acts and its passing to "Prescripta", in one list (D-85).
 *
 * Open to every profile and every case (RN11). The case is checked first, so a
 * case without movements answers an empty list while one that does not exist,
 * or was given de baja, answers 404 (CA-27.14, CA-27.16).
 *
 * **The interleaving happens here, not in the database**: the three sources
 * live in three tables, so no single `ORDER BY` can sort them together. Newest
 * first by date; on the same date, the last registered first (CA-27.2).
 *
 * The initial state ("Iniciada") never appears: no act originated it. And a
 * case outside `CRIMINAL` simply has no interruptive acts and no declaration,
 * so its line of life holds only procedural acts (CA-27.13).
 */
@Injectable()
export class GetCaseTimeline {
  constructor(
    @Inject(CASE_TIMELINE_QUERY) private readonly timeline: CaseTimelineQueryPort,
    @Inject(CLOCK) private readonly clock: ClockPort,
  ) {}

  async execute(query: { caseId: number }): Promise<TimelineEntry[]> {
    const sources = await this.timeline.findSources(query.caseId);
    if (sources === null) {
      throw new CaseNotFoundError();
    }

    // The act `prescription` counts from, computed with `cases`' one rule (D-113).
    const prescription = summarizePrescription(
      sources.offenses.map((offense) => ({
        ...offense,
        prescriptionDeclaredOn: offense.prescriptionDeclaration?.prescriptionDate ?? null,
      })),
      sources.interruptiveActs.map((view) => view.act.actDate),
      this.clock.today(),
    );
    const governing = latestOn(sources.interruptiveActs, prescription?.lastInterruptiveActDate ?? null);

    const entries: TimelineEntry[] = [
      ...sources.proceduralActs.map(
        (view): TimelineEntry => ({
          type: 'PROCEDURAL_ACT',
          date: view.act.actDate,
          registeredAt: view.act.registeredAt,
          current: view.act.id === sources.currentProceduralActId,
          proceduralAct: view,
        }),
      ),
      ...sources.interruptiveActs.map(
        (view): TimelineEntry => ({
          type: 'INTERRUPTIVE_ACT',
          date: view.act.actDate,
          registeredAt: view.act.registeredAt,
          governsPrescription: view === governing,
          interruptiveAct: view,
        }),
      ),
    ];

    for (const offense of sources.offenses) {
      if (offense.prescriptionDeclaration !== null) {
        entries.push({
          type: 'QUALIFICATION_PRESCRIPTION_DECLARATION',
          date: offense.prescriptionDeclaration.prescriptionDate,
          registeredAt: offense.prescriptionDeclaration.registeredAt,
          legalQualification: { id: offense.legalQualificationId, name: offense.legalQualificationName },
          prescriptionDeclaration: offense.prescriptionDeclaration,
        });
      }
    }

    if (sources.prescriptionDeclaration !== null) {
      entries.push({
        type: 'PRESCRIPTION_DECLARATION',
        date: sources.prescriptionDeclaration.prescriptionDate,
        registeredAt: sources.prescriptionDeclaration.registeredAt,
        prescriptionDeclaration: sources.prescriptionDeclaration,
      });
    }

    return entries.sort(newestFirst);
  }
}

/**
 * The interruptive act of that date: the one `prescription` counts from (D-113).
 * On the same date, the higher id. `null` when the prescription counts from an
 * offense date, or there is none.
 */
function latestOn(views: InterruptiveActView[], actDate: Date | null): InterruptiveActView | null {
  if (actDate === null) {
    return null;
  }
  let best: InterruptiveActView | null = null;
  for (const view of views) {
    if (view.act.actDate.getTime() === actDate.getTime() && (best === null || view.act.id > best.act.id)) {
      best = view;
    }
  }
  return best;
}

function newestFirst(a: TimelineEntry, b: TimelineEntry): number {
  return b.date.getTime() - a.date.getTime() || b.registeredAt.getTime() - a.registeredAt.getTime();
}
