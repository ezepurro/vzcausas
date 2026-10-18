/**
 * Prescription arithmetic of a criminal case (RN8, contract V4 §3.7 and §3.9).
 *
 * Pure functions over civil dates (midnight UTC), so the registration of a case
 * and the reading of one compute exactly the same thing.
 *
 * PENDIENTE HU-52 (delegado desde HU-41, CA-41.8 · 18/10/2026)
 * ------------------------------------------------------------
 * HU-52 tiene que calcular el resumen `prescription` de la causa (contrato V4
 * §3.7): la calificación que prescribe primero, `elapsedPercentage`, `alert`
 * (70 % o más del plazo transcurrido, evaluado sobre el valor exacto y no el
 * redondeado) y `expired`. Las fechas de inicio y vencimiento ya existen:
 * `prescriptionStartsOn` y `addPrescriptionMonths`, más abajo.
 *
 * **Ese cálculo también alimenta `prescriptionAlerts` del tablero del abogado**
 * (`GET /dashboards/lawyer`, V4 §3.11) y del administrador (HU-42). El criterio
 * de las alertas del tablero (ex CA-41.8) se pasó a HU-52 para que no se haga
 * dos veces: al implementar HU-52, dejar el cálculo reutilizable por los dos
 * tableros, no solo por el detalle de la causa.
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
