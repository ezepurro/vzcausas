import { PrescriptionFlags } from '../prescription-notice-kind';

/** DI token for {@link PrescriptionStatusPort}. */
export const PRESCRIPTION_STATUS = Symbol('PRESCRIPTION_STATUS');

/**
 * What the daily check (HU52) needs to know about one criminal case's
 * prescription: the two flags {@link prescriptionNoticeKind} reads, plus what
 * a `PrescriptionNotice` carries. Nothing more — no `startsOn`, no
 * percentage, no list of qualifications: `deadlines` declares the minimum it
 * needs, in its own terms (`puertos-acl.md`).
 */
export interface CasePrescriptionStatus extends PrescriptionFlags {
  caseId: number;
  caption: string;
  sacNumber: string | null;
  responsibleLawyerId: number;
  /** The qualification that prescribes first, the one that governs the case (CA-52.3). */
  legalQualificationName: string;
  /**
   * `YYYY-MM-DD`. Already a string, not a `Date`: `PrescriptionNotice.referenceDate`
   * is one, and formatting a civil date is infrastructure (`toIsoDate`), which
   * `deadlines/core` cannot import — the adapter translates (V-06).
   */
  expiresOn: string;
}

/**
 * Declared by `deadlines`, implemented by `cases` in its
 * `infrastructure/acl/` (V-05): the rules behind every field — what an active
 * case is, which qualification governs, the 70 %, the latest interruptive act
 * — are `cases`' and are applied there, so this check sees exactly what the
 * case and the dashboards see (D-72, V-04).
 *
 * **Essential port** (`EJEMPLO_CASO_DE_USO.md` §8): a failure propagates. An
 * empty list would read as "nothing to notify" and silently skip the day.
 */
export interface PrescriptionStatusPort {
  /**
   * The prescription of every **active criminal case with at least one legal
   * qualification**, computed against `today` (CA-52.1, CA-52.4): no
   * administrative cases, no amparos, no cases without qualifications, none
   * archived, prescribed or given de baja.
   *
   * Every such case comes back, alert or not: deciding which ones get a
   * notice is `deadlines`' job, not the provider's.
   *
   * `today` is a parameter, not read by the provider from its own clock, so
   * one run uses one date end to end (V-06).
   */
  findOfActiveCriminalCases(today: Date): Promise<CasePrescriptionStatus[]>;
}
