/**
 * Prescription arithmetic of a criminal case (RN8, contract V4 §3.7 and §3.9).
 *
 * Pure functions over civil dates (midnight UTC), so the registration of a case
 * and the reading of one compute exactly the same thing.
 */

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
