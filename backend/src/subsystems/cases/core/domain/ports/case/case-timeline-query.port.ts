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

/**
 * Everything the line of life of a case is made of (HU27, D-85), **complete**:
 * every procedural act and every interruptive act, not a page of them. A line
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
};

/** An offense as the line of life needs it (D-113). */
export type TimelineOffense = OffenseForPrescription & {
  prescriptionDeclaration: PrescriptionDeclarationView | null;
};

/**
 * Read port for the line of life of a case. It only gathers the three sources;
 * interleaving them and marking the current act and the governing interruptive
 * act is the use case's job, so the rule can be tested without a database.
 */
export interface CaseTimelineQueryPort {
  /** The sources of an **active** case, or `null` for one that does not exist or was given de baja. */
  findSources(caseId: number): Promise<CaseTimelineSources | null>;
}
