import {
  OffenseForPrescription,
  PrescriptionSummary,
  prescribesIn,
  summarizePrescription,
} from '@subsystems/cases/core/domain/prescription';
import { JurisdictionCode } from '@subsystems/cases/core/domain/value-objects/case/jurisdiction-code';
import { ReportPeriod } from '../value-objects/report-period.vo';

/** A procedural act in force (an annulled one never reaches the report), with what the report asks of it. */
export type ReportProceduralAct = {
  id: number;
  actDate: Date;
  /** Whether the state it moved the case to is terminal. A hand-written state never is. */
  terminal: boolean;
  /** The due date in force: the manual one if adjusted, else the computed one. `null` if the act opens no term. */
  dueDate: Date | null;
};

export type ReportCaseLawyer = { id: number; lastName: string; firstName: string };

export type ReportCaseProps = {
  caseId: number;
  sacNumber: string | null;
  caption: string;
  jurisdiction: JurisdictionCode;
  /** Cases without it are not in the report (D-129): the query leaves them out. */
  startDate: Date;
  /** The date the case was declared "Prescripta" (HU33); `null` if it was not. */
  prescribedOn: Date | null;
  /** `null` for an orphaned case (D-143). */
  responsibleLawyer: ReportCaseLawyer | null;
  /** Procedural acts in force, any order. */
  proceduralActs: ReportProceduralAct[];
  interruptiveActDates: Date[];
  offenses: OffenseForPrescription[];
};

/** How a procedural term that falls due in the month was closed (§3.13, `deadlines`). */
export type DeadlineOutcome = 'MET_ON_TIME' | 'MET_ON_LAST_DAY' | 'OVERDUE' | 'PENDING';

/**
 * A case as the monthly report sees it: the facts of its history, and the
 * questions the report asks of them **at a date** — was it active, did it enter or
 * leave in the month, how far had its prescription run, how were its terms met.
 *
 * Read model of `reporting` (ADR-002), not an entity. The state of a case at a date
 * is the one of its most recent act with `actDate` up to that date (D-14), or
 * "Prescripta" if it was already declared; nothing else is stored per month, which
 * is why the month is photographed when it closes (D-117).
 */
export class ReportCase {
  private readonly acts: ReportProceduralAct[];

  private constructor(private readonly props: ReportCaseProps) {
    this.acts = [...props.proceduralActs].sort((a, b) => a.actDate.getTime() - b.actDate.getTime() || a.id - b.id);
  }

  static hydrate(props: ReportCaseProps): ReportCase {
    return new ReportCase(props);
  }

  get caseId(): number {
    return this.props.caseId;
  }

  get sacNumber(): string | null {
    return this.props.sacNumber;
  }

  get caption(): string {
    return this.props.caption;
  }

  get jurisdiction(): JurisdictionCode {
    return this.props.jurisdiction;
  }

  /** D-145: a case with no responsible lawyer counts as "Sin asignar". */
  get responsibleLawyer(): ReportCaseLawyer | null {
    return this.props.responsibleLawyer;
  }

  /**
   * The lawyer the report counts the case under, or `null` for "Sin asignar" (D-145): a case with no
   * responsible lawyer (orphaned) and also one whose lawyer is no longer vigente, for example given
   * de baja after the case closed. The report keeps no history of lawyers: a lawyer that is not
   * vigente has no row in it, so what the study's lawyers carry and what is unassigned always add up.
   */
  countedUnder(vigentLawyerIds: ReadonlySet<number>): ReportCaseLawyer | null {
    const lawyer = this.props.responsibleLawyer;
    return lawyer !== null && vigentLawyerIds.has(lawyer.id) ? lawyer : null;
  }

  /** Not started yet at that date counts as not existing for the report. */
  isActiveAt(date: Date): boolean {
    return this.props.startDate <= date && !this.isTerminalAt(date);
  }

  /** "Ingresada en el mes": its `startDate` falls inside the month, up to the cut-off. */
  wasAdmittedIn(period: ReportPeriod, cutOff: Date): boolean {
    return period.contains(this.props.startDate) && this.props.startDate <= cutOff;
  }

  /**
   * "Archivada en el mes": it went into a terminal state inside the month, whichever
   * terminal state (the date of the act, or of the declaration for "Prescripta").
   * It had to be active at the start of the month or admitted during it, so that
   * a case already closed before is not counted twice. An orphaned case that is
   * still active is not archived (D-145).
   */
  wasArchivedIn(period: ReportPeriod, cutOff: Date): boolean {
    const beforeTheMonth = period.previous().lastDay();
    const inTheSystemAtStart = this.props.startDate > beforeTheMonth || !this.isTerminalAt(beforeTheMonth);
    return this.props.startDate <= cutOff && inTheSystemAtStart && this.isTerminalAt(cutOff);
  }

  /**
   * The prescription of the case at `date`: `cases`' own summary
   * ({@link summarizePrescription}, the one the dashboards use), computed with what
   * was known at that date — the interruptive acts and the declarations up to it.
   * `null` outside the criminal fuero or with nothing to compute (D-74).
   */
  prescriptionAt(date: Date): PrescriptionSummary | null {
    if (!prescribesIn(this.props.jurisdiction)) return null;
    const offenses = this.props.offenses.map((offense) => ({
      ...offense,
      // A declaration made after the cut-off did not exist yet (D-113).
      prescriptionDeclaredOn:
        offense.prescriptionDeclaredOn != null && offense.prescriptionDeclaredOn <= date
          ? offense.prescriptionDeclaredOn
          : null,
    }));
    // With every qualification declared the case has no `prescription` (D-113, §3.13).
    if (offenses.length > 0 && offenses.every((offense) => offense.prescriptionDeclaredOn !== null)) return null;
    const interruptive = this.props.interruptiveActDates.filter((actDate) => actDate <= date);
    return summarizePrescription(offenses, interruptive, date);
  }

  /**
   * How each procedural term that falls due inside the month was closed. The act
   * that closes a term is the **next** procedural act of the same case (§3.13): on
   * time if its `actDate` is before the due date, on the last day if it is the due
   * date. With no such act the term went by (`OVERDUE`), unless the month is the one
   * in progress and the due date is today or later (`PENDING`). An act that opens no
   * term is not counted; neither is the harmful act of an amparo (D-135).
   */
  deadlineOutcomesIn(period: ReportPeriod, cutOff: Date, inProgress: boolean): DeadlineOutcome[] {
    const outcomes: DeadlineOutcome[] = [];
    this.acts.forEach((act, index) => {
      const dueDate = act.dueDate;
      if (dueDate === null || !period.contains(dueDate)) return;
      const next = this.acts[index + 1];
      if (next !== undefined && next.actDate <= dueDate && next.actDate <= cutOff) {
        outcomes.push(next.actDate < dueDate ? 'MET_ON_TIME' : 'MET_ON_LAST_DAY');
      } else if (inProgress && dueDate >= cutOff) {
        outcomes.push('PENDING');
      } else {
        outcomes.push('OVERDUE');
      }
    });
    return outcomes;
  }

  /** Interruptive acts of the case dated inside the month, up to the cut-off. */
  interruptiveActsIn(period: ReportPeriod, cutOff: Date): number {
    return this.props.interruptiveActDates.filter((actDate) => period.contains(actDate) && actDate <= cutOff).length;
  }

  private isTerminalAt(date: Date): boolean {
    if (this.props.prescribedOn !== null && this.props.prescribedOn <= date) return true;
    const inForce = this.acts.filter((act) => act.actDate <= date);
    return inForce.length > 0 && inForce[inForce.length - 1].terminal;
  }
}
