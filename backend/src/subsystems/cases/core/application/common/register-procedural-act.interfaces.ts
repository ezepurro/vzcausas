import { AuthenticatedUser } from '@shared/domain/authenticated-user';
import { ProceduralAct } from '../../domain/entities/procedural-act';

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
  // `false` if the act is older than the current one: on record, but the case did not move (CA-26.10).
  becameCurrent: boolean;
}
