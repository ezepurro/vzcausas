import { CaseResponsibleChange } from '../../entities/case-responsible-change.entity';
import { OffenseForPrescription } from '../../prescription';
import { InterruptiveActView } from '../interruptive-act/interruptive-act.repository';
import { ProceduralActView } from '../procedural-act/procedural-act.repository';

/** DI token for {@link CaseTimelineQueryPort}. */
export const CASE_TIMELINE_QUERY = Symbol('CASE_TIMELINE_QUERY');

/**
 * The declaration that a case prescribed (HU33), as the line of life shows it.
 * Same fields as the `prescriptionDeclaration` of the case (contract V4 §3.7).
 */
export type PrescriptionDeclarationView = {
  prescriptionDate: Date;
  resolution: string;
  grounds: string | null;
  registeredBy: { id: number; lastName: string; firstName: string };
  registeredAt: Date;
};

/** A person as the line of life names them: a lawyer or a user (D-147). */
export type PersonView = { id: number; lastName: string; firstName: string };

/**
 * A change of the responsible lawyer, as the line of life shows it (D-147).
 * The lawyers are read **as they are today**, not filtered by `active`: one given
 * de baja still figures in the history of the case (RN12).
 */
export type ResponsibleChangeView = {
  id: number;
  /** The record, which decides its own `kind`. */
  change: CaseResponsibleChange;
  previousLawyer: PersonView | null;
  newLawyer: PersonView | null;
  /** The USER who made the change: not necessarily a lawyer. */
  changedBy: PersonView;
  /**
   * Civil date of `change.changedAt` in the study's time zone (`APP_TIMEZONE`), at midnight
   * UTC like a `date` column. The entry's `date` is this one, not the UTC day.
   */
  changedOn: Date;
};

/**
 * Everything the line of life of a case is made of (HU27, D-85), **complete**:
 * every procedural act, every interruptive act and every change of responsible, not a page of them. A line
 * of life cut at a page would be wrong without anything showing it.
 */
export type CaseTimelineSources = {
  /** The act that took the case to its current state: its deadline is the open one. */
  currentProceduralActId: number | null;
  proceduralActs: ProceduralActView[];
  interruptiveActs: InterruptiveActView[];
  /** `null` while the case was not marked as prescribed. */
  prescriptionDeclaration: PrescriptionDeclarationView | null;
  /**
   * D-113: the offenses of the case, with their declaration if they were
   * declared prescribed. Each declaration is an entry of the line of life, and
   * which interruptive act governs depends on them (`prescription.ts`).
   */
  offenses: TimelineOffense[];
  /** D-147: every change of the responsible lawyer of the case, in any order. */
  responsibleChanges: ResponsibleChangeView[];
};

/** An offense as the line of life needs it (D-113). */
export type TimelineOffense = OffenseForPrescription & {
  prescriptionDeclaration: PrescriptionDeclarationView | null;
};

/**
 * Read port for the line of life of a case. It only gathers the sources;
 * interleaving them and marking the current act and the governing interruptive
 * act is the use case's job, so the rule can be tested without a database.
 */
export interface CaseTimelineQueryPort {
  /** The sources of an **active** case, or `null` for one that does not exist or was given de baja. */
  findSources(caseId: number): Promise<CaseTimelineSources | null>;
}
