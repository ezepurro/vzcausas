import { InvalidReassignmentsError, LawyerHasDependenciesError } from "../errors/people.errors";

/** What happens to one case of the lawyer given de baja: to another lawyer, or `null` for "Sin asignar" (D-143). */
export interface CaseReassignment {
  readonly caseId: number;
  readonly responsibleLawyerId: number | null;
}

/** What only the use case can read, to check a plan against the real data. */
export interface ReassignmentContext {
  /** The lawyer given de baja. */
  readonly lawyerId: number;
  /** The ids of their active cases. */
  readonly activeCaseIds: readonly number[];
  /** Of the target lawyers the plan names, those that exist and are active. */
  readonly activeTargetLawyerIds: ReadonlySet<number>;
}

const isPositiveInteger = (value: unknown): value is number =>
  typeof value === "number" && Number.isInteger(value) && value > 0;

/**
 * The distribution of a lawyer's active cases when they are given de baja (HU15, D-143): for
 * each case, the lawyer that takes it or `unassigned: true` to leave it orphaned.
 *
 * `parse` checks the **shape** of what the form sent; {@link assertApplicableTo} checks it
 * against the lawyer's real cases and the target lawyers; {@link assertCovers} checks that no
 * active case was left out. Each fails with the contract's own error and the first problem
 * found wins, in the order of the entries.
 */
export class CaseReassignmentPlan {
  private constructor(private readonly entries: readonly CaseReassignment[]) {}

  /**
   * @param raw what the body carried under `reassignments`. Absent means no cases to
   *   distribute, valid for a lawyer without active cases.
   * @throws {InvalidReassignmentsError} an entry that is not an object, a case repeated, an
   *   entry with neither `responsibleLawyerId` nor `unassigned`, with both, or with an
   *   `unassigned` that is not `true`.
   */
  static parse(raw: unknown): CaseReassignmentPlan {
    if (raw === undefined || raw === null) {
      return new CaseReassignmentPlan([]);
    }
    if (!Array.isArray(raw)) {
      throw new InvalidReassignmentsError("Debe ser una lista de causas.");
    }

    const seen = new Set<number>();
    const entries = raw.map((item: unknown, index: number): CaseReassignment => {
      if (typeof item !== "object" || item === null || Array.isArray(item)) {
        throw new InvalidReassignmentsError(`La entrada ${index + 1} no es válida.`);
      }
      const entry = item as Record<string, unknown>;
      if (!isPositiveInteger(entry.caseId)) {
        throw new InvalidReassignmentsError(`La entrada ${index + 1} no indica una causa válida.`);
      }
      if (seen.has(entry.caseId)) {
        throw new InvalidReassignmentsError(`La causa ${entry.caseId} figura más de una vez.`);
      }
      seen.add(entry.caseId);
      return CaseReassignmentPlan.entryOf(entry.caseId, entry);
    });
    return new CaseReassignmentPlan(entries);
  }

  private static entryOf(caseId: number, entry: Record<string, unknown>): CaseReassignment {
    const hasLawyer = entry.responsibleLawyerId !== undefined;
    const hasUnassigned = entry.unassigned !== undefined;

    if (hasLawyer === hasUnassigned) {
      throw new InvalidReassignmentsError(
        hasLawyer
          ? `La causa ${caseId} no puede llevar a la vez un abogado y "sin asignar".`
          : `La causa ${caseId} debe indicar un abogado o "sin asignar".`,
      );
    }
    if (hasUnassigned) {
      if (entry.unassigned !== true) {
        throw new InvalidReassignmentsError(`La causa ${caseId} solo admite "sin asignar" con el valor true.`);
      }
      return { caseId, responsibleLawyerId: null };
    }
    if (!isPositiveInteger(entry.responsibleLawyerId)) {
      throw new InvalidReassignmentsError(`La causa ${caseId} no indica un abogado de destino válido.`);
    }
    return { caseId, responsibleLawyerId: entry.responsibleLawyerId };
  }

  get reassignments(): readonly CaseReassignment[] {
    return this.entries;
  }

  get caseIds(): number[] {
    return this.entries.map((entry) => entry.caseId);
  }

  /** The lawyers that take cases, without repeats: the ones the use case has to look up. */
  get targetLawyerIds(): number[] {
    const targets = this.entries.flatMap((entry) =>
      entry.responsibleLawyerId === null ? [] : [entry.responsibleLawyerId],
    );
    return [...new Set(targets)];
  }

  /**
   * @throws {InvalidReassignmentsError} a case that is not an active case of this lawyer, or a
   *   target lawyer that does not exist, was given de baja or is the one being given de baja.
   */
  assertApplicableTo(context: ReassignmentContext): void {
    const active = new Set(context.activeCaseIds);
    for (const { caseId, responsibleLawyerId } of this.entries) {
      if (!active.has(caseId)) {
        throw new InvalidReassignmentsError(`La causa ${caseId} no es una causa activa de este abogado.`);
      }
      if (responsibleLawyerId === null) {
        continue;
      }
      if (responsibleLawyerId === context.lawyerId) {
        throw new InvalidReassignmentsError(
          `La causa ${caseId} no puede pasar al mismo abogado que se da de baja.`,
        );
      }
      if (!context.activeTargetLawyerIds.has(responsibleLawyerId)) {
        throw new InvalidReassignmentsError(
          `El abogado de destino de la causa ${caseId} no existe o está dado de baja.`,
        );
      }
    }
  }

  /** @throws {LawyerHasDependenciesError} an active case of the lawyer is not in the plan. */
  assertCovers(activeCaseIds: readonly number[]): void {
    const planned = new Set(this.caseIds);
    if (activeCaseIds.some((caseId) => !planned.has(caseId))) {
      throw new LawyerHasDependenciesError();
    }
  }
}
