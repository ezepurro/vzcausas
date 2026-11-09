import { businessDaysRemaining } from '@subsystems/cases/core/domain/business-days';
import { summarizePrescription } from '@subsystems/cases/core/domain/prescription';
import { DashboardCaseRow, DashboardLawyerRef } from '../ports/lawyer-dashboard.query';

export const CRIMINAL = 'CRIMINAL';
/** "Próx. 5 días hábiles" (V4 §3.11). */
export const DUE_SOON_MAX_BUSINESS_DAYS = 5;

export type DashboardDeadlineView = {
  caseId: number;
  /**
   * Only procedural acts for now: the amparo's harmful act is pending `harmfulActDeadline` (CA-41.6).
   *
   * PENDIENTE para quien tenga HU-41/HU-42 (dejado el 20/10/2026 desde HU-51):
   * el contrato pide que los dos tableros listen también el vencimiento del
   * acto lesivo, con `kind: 'HARMFUL_ACT'`, y que cuente en `summary`
   * (V4 §3.7 "Dónde se ve", D-78). La verificación diaria (HU-51) **ya lo
   * avisa por correo**, así que hasta que esto se haga el correo dice algo que
   * el tablero no muestra (CA-51.9). Para no reescribir la regla:
   * `harmfulActOf` (exportado de `cases/core/application/use-cases/case/list-cases.use-case.ts`)
   * + `HarmfulAct.deadline(today)`, solo en un amparo que sigue en "Iniciada";
   * es lo mismo que usan `ListCases` y `ListOpenDeadlines`. La consulta
   * (`DashboardCaseRow`) tiene que traer los `harmfulAct*` y si el estado es
   * el inicial. Ver `IMPLEMENTACION_DETECCION.md`, B5.
   */
  kind: 'PROCEDURAL_ACT';
  sacNumber: string | null;
  caption: string;
  jurisdiction: string;
  currentStateName: string;
  responsibleLawyer: DashboardLawyerRef;
  dueDate: Date;
  businessDaysRemaining: number;
};

/** A criminal case with 70 % or more of its prescription term elapsed (CA-41.8). */
export type PrescriptionAlertView = {
  caseId: number;
  sacNumber: string | null;
  caption: string;
  responsibleLawyer: DashboardLawyerRef;
  legalQualificationName: string;
  startsOn: Date;
  expiresOn: Date;
  elapsedPercentage: number;
  expired: boolean;
};

/** "Vencidos" / "Vencen hoy" / "Próx. 5 días hábiles": the same three cuts, over any list of open deadlines. */
export function countByUrgency(
  deadlines: Pick<DashboardDeadlineView, 'businessDaysRemaining'>[],
): { overdue: number; dueToday: number; dueSoon: number } {
  return {
    overdue: deadlines.filter((d) => d.businessDaysRemaining < 0).length,
    dueToday: deadlines.filter((d) => d.businessDaysRemaining === 0).length,
    dueSoon: deadlines.filter(
      (d) => d.businessDaysRemaining >= 1 && d.businessDaysRemaining <= DUE_SOON_MAX_BUSINESS_DAYS,
    ).length,
  };
}

/**
 * Shared between "Mi día" (HU41) and "Estudio" (HU42): the shape of an open
 * deadline and of a prescription alert, and the rules they rest on —
 * `businessDaysRemaining` and `summarizePrescription` — are `cases`', reused
 * here instead of rewritten per dashboard (ADR-002).
 */
export function toDeadline(row: DashboardCaseRow & { dueDate: Date }, today: Date): DashboardDeadlineView {
  return {
    caseId: row.caseId,
    kind: 'PROCEDURAL_ACT',
    sacNumber: row.sacNumber,
    caption: row.caption,
    jurisdiction: row.jurisdiction,
    currentStateName: row.currentStateName,
    responsibleLawyer: row.responsibleLawyer,
    dueDate: row.dueDate,
    businessDaysRemaining: businessDaysRemaining(today, row.dueDate),
  };
}

/**
 * CA-41.8: the criminal cases whose prescription is at 70 % or more, the one
 * that prescribes first on top. The rule is `cases`' summary, the same the
 * case detail and the daily check (HU52) are meant to use: an expired term stays
 * here until the case is marked "Prescripta", which makes it inactive.
 */
export function toPrescriptionAlerts(cases: DashboardCaseRow[], today: Date): PrescriptionAlertView[] {
  return cases
    .filter((row) => row.jurisdiction === CRIMINAL)
    .flatMap((row) => {
      const summary = summarizePrescription(row.offenses, row.interruptiveActDates, today);
      if (summary === null || !summary.alert) return [];
      return [
        {
          caseId: row.caseId,
          sacNumber: row.sacNumber,
          caption: row.caption,
          responsibleLawyer: row.responsibleLawyer,
          legalQualificationName: summary.legalQualificationName,
          startsOn: summary.startsOn,
          expiresOn: summary.expiresOn,
          elapsedPercentage: summary.elapsedPercentage,
          expired: summary.expired,
        },
      ];
    })
    .sort((a, b) => a.expiresOn.getTime() - b.expiresOn.getTime() || a.caseId - b.caseId);
}
