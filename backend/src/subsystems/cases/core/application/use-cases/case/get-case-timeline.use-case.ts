import { Inject, Injectable } from '@nestjs/common';
import { CaseNotFoundError } from '../../../domain/errors/case.errors';
import {
  CASE_TIMELINE_QUERY,
  CaseTimelineQueryPort,
  PrescriptionDeclarationView,
} from '../../../domain/ports/case/case-timeline-query.port';
import { InterruptiveActView } from '../../../domain/ports/interruptive-act/interruptive-act.repository';
import { ProceduralActView } from '../../../domain/ports/procedural-act/procedural-act.repository';

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
      /** The most recent interruptive act, the one the prescription counts from (CA-27.11). */
      governsPrescription: boolean;
      interruptiveAct: InterruptiveActView;
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
  constructor(@Inject(CASE_TIMELINE_QUERY) private readonly timeline: CaseTimelineQueryPort) {}

  async execute(query: { caseId: number }): Promise<TimelineEntry[]> {
    const sources = await this.timeline.findSources(query.caseId);
    if (sources === null) {
      throw new CaseNotFoundError();
    }

    const governing = mostRecent(sources.interruptiveActs);

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
 * The interruptive act that governs the prescription: the most recent **by its
 * date**, not the last registered (CA-31.4); on the same date, the higher id.
 * The same rule `prescription.ts` applies when reading the case.
 */
function mostRecent(views: InterruptiveActView[]): InterruptiveActView | null {
  let best: InterruptiveActView | null = null;
  for (const view of views) {
    if (
      best === null ||
      view.act.actDate > best.act.actDate ||
      (view.act.actDate.getTime() === best.act.actDate.getTime() && view.act.id > best.act.id)
    ) {
      best = view;
    }
  }
  return best;
}

function newestFirst(a: TimelineEntry, b: TimelineEntry): number {
  return b.date.getTime() - a.date.getTime() || b.registeredAt.getTime() - a.registeredAt.getTime();
}
