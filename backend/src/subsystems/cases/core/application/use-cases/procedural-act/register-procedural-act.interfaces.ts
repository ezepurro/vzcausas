import { AuthenticatedUser } from '@shared/domain/authenticated-user';
import { ProceduralAct } from '../../../domain/entities/procedural-act.entity';
import { DayType } from '../../../domain/value-objects/deadline/day-type';
import { LawyerRef } from '../../../domain/ports/case/people-lookup.port';

/** What the user asks for when registering a procedural act (HU26). */
export interface RegisterProceduralActCommand {
  caseId: number;
  // Who registers it: only the lawyer in charge of the case may (D-30).
  actor: AuthenticatedUser;
  // Exactly one of the two: a state of the table of the jurisdiction or a hand-written one.
  proceduralStateId?: number | null;
  customState?: string | null;
  actDate: Date;
  // Only ADMINISTRATIVE cases (RN6).
  notificationDate?: Date | null;
  // Adjusts the due date by hand; the computed one is kept.
  manualDueDate?: Date | null;
  notes?: string | null;
}

export interface RegisterProceduralActResult {
  act: ProceduralAct;
  // Name of the state the case moves to: the one of the table or the hand-written text.
  resultingStateName: string;
  // The lawyer who registered it (the one in charge of the case).
  registeredBy: LawyerRef;
  // `false` if the act is older than the current one: on record, but the case did not move (CA-26.10).
  becameCurrent: boolean;
}

/** What the user has filled in so far, to see the deadline an act would open (API contract §3.8). */
export interface PreviewProceduralActDeadlineQuery {
  caseId: number;
  // Same rule as to register: only the lawyer in charge of the case.
  actor: AuthenticatedUser;
  proceduralStateId?: number | null;
  actDate: Date;
  // Only ADMINISTRATIVE cases (RN6).
  notificationDate?: Date | null;
}

export interface DeadlinePreviewResult {
  proceduralStateId: number;
  // `0` and `NONE` when the state opens no term.
  timeLimitDays: number;
  dayType: DayType;
  countsFrom: Date;
  // `null` when the state opens no term.
  dueDate: Date | null;
  // Business days from today (excluded) to `dueDate` (included); negative if it already ran out.
  businessDaysRemaining: number | null;
}
