import { OffenseForPrescription } from '../../prescription';

/** DI token for {@link CriminalPrescriptionQueryPort}. */
export const CRIMINAL_PRESCRIPTION_QUERY = Symbol('CRIMINAL_PRESCRIPTION_QUERY');

/**
 * One criminal case with what its prescription is computed from: its offenses
 * and the dates of its interruptive acts. The inputs of
 * `summarizePrescription`, not its result — computing it is the use case's
 * job, against the date it is given.
 */
export type CriminalCasePrescriptionRow = {
  caseId: number;
  caption: string;
  sacNumber: string | null;
  responsibleLawyerId: number;
  /** At least one. A deactivated qualification still counts: it is part of the case's history (RN12, §4 Bajas). */
  offenses: OffenseForPrescription[];
  /**
   * Every interruptive act of the case, by act date (not by when it was
   * registered, CA-31.4). All of them: whether one restarts an offense depends
   * on the ones before it (D-113). Empty without interruptive acts.
   */
  interruptiveActDates: Date[];
};

/**
 * Read port for the daily prescription check (HU52). Its own port, not one
 * more method of `CaseRepository`: that one projects the case resource of
 * HU20/HU22, and this is a different read model with a single reader (V-08,
 * `IMPLEMENTACION_DETECCION.md`).
 */
export interface CriminalPrescriptionQueryPort {
  /**
   * Every **active** case (§4, Causa activa) of the `CRIMINAL` jurisdiction
   * with at least one legal qualification, by id (CA-52.1, CA-52.4).
   *
   * Out by construction: administrative cases and amparos, which do not
   * prescribe; a criminal case without qualifications, which does not either
   * (D-74); and any case given de baja or in a terminal state ("Archivada",
   * "Prescripta"). In: a case still in "Iniciada" or in a hand-written state,
   * which is active and prescribes all the same.
   *
   * Not paginated: it is read once per daily run, and bounded by the active
   * criminal cases of one study.
   */
  findActiveWithQualifications(): Promise<CriminalCasePrescriptionRow[]>;
}
