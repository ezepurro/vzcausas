/** Who did it: a user giving a lawyer de baja (D-143) or a user with `PATCH /cases/{caseId}`. */
export type ResponsibleChangeOrigin = 'MANUAL' | 'LAWYER_REMOVAL';

/** What kind of change it was, decided from the two lawyers (D-147). */
export type ResponsibleChangeKind = 'REASSIGNED' | 'ORPHANED' | 'ASSIGNED_FROM_ORPHAN';

export interface NewCaseResponsibleChangeInput {
  caseId: number;
  /** `null`: the case was orphaned before. */
  previousLawyerId: number | null;
  /** `null`: the case is left orphaned (D-143). */
  newLawyerId: number | null;
  /** The USER who made the change, not necessarily a lawyer. */
  changedByUserId: number;
  origin: ResponsibleChangeOrigin;
  changedAt: Date;
}

/**
 * A change of the responsible lawyer of a case (HU27, D-147): from whom to whom,
 * who did it and when. It is what the line of life shows.
 *
 * It is a record, not a thing that changes: it is created once and never
 * modified or deleted (RN12). It decides its own {@link kind}, so no use case
 * or mapper has to infer it from the two lawyers.
 *
 * Mirror of the CHECK `ck_case_responsible_changes_differs`: the two lawyers
 * are never both `null` and never the same one.
 */
export class CaseResponsibleChange {
  private constructor(private readonly input: NewCaseResponsibleChangeInput) {}

  /**
   * @throws {Error} the two lawyers are the same or both `null`: the responsible did not
   *   change, so the caller must not record anything. It is a programming error, not a user one.
   */
  static create(input: NewCaseResponsibleChangeInput): CaseResponsibleChange {
    if (input.previousLawyerId === input.newLawyerId) {
      throw new Error(
        input.previousLawyerId === null
          ? 'A responsible change needs at least one lawyer: both are null.'
          : 'A responsible change needs two different lawyers: the responsible did not change.',
      );
    }
    return new CaseResponsibleChange({ ...input });
  }

  get kind(): ResponsibleChangeKind {
    if (this.input.newLawyerId === null) {
      return 'ORPHANED';
    }
    return this.input.previousLawyerId === null ? 'ASSIGNED_FROM_ORPHAN' : 'REASSIGNED';
  }

  get caseId(): number {
    return this.input.caseId;
  }

  get previousLawyerId(): number | null {
    return this.input.previousLawyerId;
  }

  get newLawyerId(): number | null {
    return this.input.newLawyerId;
  }

  get changedByUserId(): number {
    return this.input.changedByUserId;
  }

  get origin(): ResponsibleChangeOrigin {
    return this.input.origin;
  }

  get changedAt(): Date {
    return this.input.changedAt;
  }
}
