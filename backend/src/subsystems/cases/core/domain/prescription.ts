/**
 * Prescription arithmetic of a criminal case (RN8, contract V4 §3.7 and §3.9).
 *
 * Pure functions over civil dates (midnight UTC), so the registration of a case
 * and the reading of one compute exactly the same thing.
 *
 * El resumen `prescription` de la causa (contrato V4 §3.7) es
 * {@link summarizePrescription}. Lo usan el recurso causa —listado, detalle y
 * alta (`withDeadlines` en `list-cases.use-case.ts`, `RegisterCase`)— y las
 * alertas de los dos tableros (HU-41, HU-42, `dashboard-shared.ts`). La
 * verificación diaria (HU-52) tiene que usar esta misma función, no volver a
 * escribir la regla del 70 %.
 */

import { JurisdictionCode } from './value-objects/jurisdiction-code';

const DAY_MS = 24 * 60 * 60 * 1000;

/** "Próxima a prescribir": 70 % o más del plazo transcurrido. Fijo, no configurable (V4 §4, Prescripción). */
export const PRESCRIPTION_ALERT_RATIO = 0.7;

/** One offense of a criminal case: its qualification and the date of the facts. */
export interface OffenseForPrescription {
  legalQualificationId: number;
  legalQualificationName: string;
  prescriptionMonths: number;
  offenseDate: Date;
}

/** The `prescription` of a case (V4 §3.7): the one of the qualification that prescribes first. */
export interface PrescriptionSummary {
  legalQualificationId: number;
  legalQualificationName: string;
  startsOn: Date;
  expiresOn: Date;
  /** Rounded to the nearest integer, between 0 and 100. */
  elapsedPercentage: number;
  /** 70 % or more elapsed, judged on the exact value and not on the rounded one. */
  alert: boolean;
  /** Today is on or after `expiresOn`. It does not change the state of the case. */
  expired: boolean;
  /** Calendar days from today to `expiresOn`. `0` the day it is met, negative once it is overdue. */
  remainingDays: number;
  /** The interruptive act this computation counts from; `null` if it counts from the offense. */
  lastInterruptiveActDate: Date | null;
}

/**
 * `start` plus `months` calendar months. When the target month is shorter, the
 * date falls on its last day: 31/1 plus one month is 28/2 (or 29/2).
 *
 * Extracted from `Offense.calculatePrescription`, which used to hold it alone:
 * since HU31 the read side recalculates the expiry too, and two copies of the
 * "shorter month" rule would drift.
 */
export function addPrescriptionMonths(start: Date, months: number): Date {
  const year = start.getUTCFullYear();
  const month = start.getUTCMonth() + months;
  const lastDayOfMonth = new Date(Date.UTC(year, month + 1, 0)).getUTCDate();
  return new Date(Date.UTC(year, month, Math.min(start.getUTCDate(), lastDayOfMonth)));
}

/**
 * The date a qualification's prescription counts from (HU31).
 *
 * It is the date of the case's **most recent** interruptive act (by its act
 * date, not by when it was registered), unless that act is older than the
 * offense: the prescription never counts from before the offense itself
 * (CA-31.5). Without interruptive acts it is the offense date.
 */
export function prescriptionStartsOn(offenseDate: Date, lastInterruptiveActDate: Date | null): Date {
  if (lastInterruptiveActDate === null || lastInterruptiveActDate < offenseDate) {
    return offenseDate;
  }
  return lastInterruptiveActDate;
}

/** Only a criminal case prescribes: in the other jurisdictions the prototype says "No aplica al fuero". */
export function prescribesIn(jurisdiction: JurisdictionCode): boolean {
  return jurisdiction === JurisdictionCode.CRIMINAL;
}

/**
 * The prescription of a criminal case (V4 §3.7 and §4, Prescripción): the term
 * of the qualification that expires first. It is the one rule of "which
 * prescription does this case have": the listing, the detail, the registration
 * and the dashboards all go through it.
 */
export class Prescription implements PrescriptionSummary {
  private constructor(
    readonly legalQualificationId: number,
    readonly legalQualificationName: string,
    readonly startsOn: Date,
    readonly expiresOn: Date,
    readonly elapsedPercentage: number,
    readonly alert: boolean,
    readonly expired: boolean,
    readonly remainingDays: number,
    readonly lastInterruptiveActDate: Date | null,
  ) {}

  /**
   * The prescription that governs a case, whatever its jurisdiction: `null` where
   * the jurisdiction does not prescribe ({@link prescribesIn}) or when there is
   * nothing to compute. Callers do not repeat the `if` on the jurisdiction.
   */
  static of(
    jurisdiction: JurisdictionCode,
    offenses: readonly OffenseForPrescription[],
    lastInterruptiveActDate: Date | null,
    today: Date,
  ): Prescription | null {
    return prescribesIn(jurisdiction) ? Prescription.governing(offenses, lastInterruptiveActDate, today) : null;
  }

  /**
   * Every qualification computes its own term from the same start, and the one
   * that **expires first** governs the case (ties: the lowest qualification id,
   * so the result does not depend on the order of the rows). The elapsed share is
   * calendar days from `startsOn` to today over calendar days from `startsOn` to
   * `expiresOn`, kept between 0 and 1.
   *
   * `null` when there is nothing to compute: a case without qualifications
   * (D-74). The jurisdiction is not looked at here; see {@link Prescription.of}.
   */
  static governing(
    offenses: readonly OffenseForPrescription[],
    lastInterruptiveActDate: Date | null,
    today: Date,
  ): Prescription | null {
    const terms = offenses.map((offense) => {
      const startsOn = prescriptionStartsOn(offense.offenseDate, lastInterruptiveActDate);
      return { offense, startsOn, expiresOn: addPrescriptionMonths(startsOn, offense.prescriptionMonths) };
    });
    if (terms.length === 0) {
      return null;
    }

    const [first] = [...terms].sort(
      (a, b) =>
        a.expiresOn.getTime() - b.expiresOn.getTime() || a.offense.legalQualificationId - b.offense.legalQualificationId,
    );
    const { offense, startsOn, expiresOn } = first;

    const totalDays = (expiresOn.getTime() - startsOn.getTime()) / DAY_MS;
    const elapsedDays = (today.getTime() - startsOn.getTime()) / DAY_MS;
    const ratio = totalDays <= 0 ? 1 : Math.min(1, Math.max(0, elapsedDays / totalDays));

    return new Prescription(
      offense.legalQualificationId,
      offense.legalQualificationName,
      startsOn,
      expiresOn,
      Math.round(ratio * 100),
      ratio >= PRESCRIPTION_ALERT_RATIO,
      today >= expiresOn,
      // Calendar days to the expiry: `0` the day it is met, negative once overdue (the daily digest, HU32).
      Math.round((expiresOn.getTime() - today.getTime()) / DAY_MS),
      // The act counts only if the computation really starts from it (CA-31.5).
      startsOn.getTime() === offense.offenseDate.getTime() ? null : startsOn,
    );
  }
}

/**
 * The prescription summary of a criminal case. Kept under the name the rest of
 * the code (the dashboards, HU52) already uses; it is {@link Prescription.governing}.
 */
export function summarizePrescription(
  offenses: readonly OffenseForPrescription[],
  lastInterruptiveActDate: Date | null,
  today: Date,
): PrescriptionSummary | null {
  return Prescription.governing(offenses, lastInterruptiveActDate, today);
}
