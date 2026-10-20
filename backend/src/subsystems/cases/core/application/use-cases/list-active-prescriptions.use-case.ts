import { Inject, Injectable } from '@nestjs/common';
import {
  CRIMINAL_PRESCRIPTION_QUERY,
  CriminalPrescriptionQueryPort,
} from '../../domain/ports/criminal-prescription-query.port';
import { PrescriptionSummary, summarizePrescription } from '../../domain/prescription';

export type ListActivePrescriptionsQuery = {
  /** The civil date to compute against. Given by the caller, so one daily run uses one date (V-06). */
  today: Date;
};

/** One active criminal case and its prescription, as `summarizePrescription` computes it. */
export type ActivePrescriptionView = {
  caseId: number;
  caption: string;
  sacNumber: string | null;
  responsibleLawyerId: number;
  prescription: PrescriptionSummary;
};

/**
 * The prescription of every active criminal case with a legal qualification,
 * against a given date. What the daily check (HU52) reads, through
 * `deadlines`' port, so it sees the same prescription the dashboards show.
 *
 * **A use case and not a pass-through** (V-07, `IMPLEMENTACION_DETECCION.md`):
 * there is a rule to apply on top of the rows, and it is `cases`' —
 * {@link summarizePrescription}: the qualification that prescribes first, the
 * latest interruptive act, the 70 % (CA-52.3, CA-52.6). It is reused, never
 * rewritten (`prescription.ts`), and nothing is stored computed, so a change of
 * a qualification's term or a new interruptive act shows on the next run
 * (D-08, CA-52.8).
 *
 * Every case comes back, in alert or not: which ones deserve a notice is the
 * consumer's decision.
 */
@Injectable()
export class ListActivePrescriptions {
  constructor(
    @Inject(CRIMINAL_PRESCRIPTION_QUERY) private readonly cases: CriminalPrescriptionQueryPort,
  ) {}

  async execute(query: ListActivePrescriptionsQuery): Promise<ActivePrescriptionView[]> {
    const rows = await this.cases.findActiveWithQualifications();

    return rows.flatMap((row): ActivePrescriptionView[] => {
      const prescription = summarizePrescription(row.offenses, row.lastInterruptiveActDate, query.today);
      // `null` only without offenses, which the port already leaves out (D-74);
      // dropped here too so the guarantee does not rest on the query alone.
      if (prescription === null) {
        return [];
      }
      return [
        {
          caseId: row.caseId,
          caption: row.caption,
          sacNumber: row.sacNumber,
          responsibleLawyerId: row.responsibleLawyerId,
          prescription,
        },
      ];
    });
  }
}
