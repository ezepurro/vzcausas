import {
  CaseInTerminalStateError,
  LegalQualificationAlreadyPrescribedError,
  LegalQualificationNotInCaseError,
  PrescriptionNotApplicableError,
} from '../../errors/case.errors';
import { ProceduralStateRef } from '../../ports/case/legal-parameters-lookup.port';
import { CaseDataRules, FieldErrors } from '../../rules/case-data-rules';
import { CaseChanges, CaseField, CaseModificationContext, PendingChanges } from './case-changes';
import { JurisdictionCode } from '../../value-objects/case/jurisdiction-code';
import { PrescriptionDeclaration } from '../../value-objects/prescription/prescription-declaration.vo';
import { CaseSnapshot } from './case-snapshot';
import { Case, CaseProps, DeclarePrescriptionInput, DeclareQualificationPrescriptionInput } from './case.entity';
import { Offense } from './offense.entity';

export interface CriminalCaseProps extends CaseProps {
  // May be empty (D-33): the case then has no prescription to compute.
  offenses: Offense[];
  // Whether the client is in custody (D-67). Only in this jurisdiction.
  clientDetained: boolean;
  // Recorded once when the case is marked as prescribed (HU33); `null` until then.
  prescriptionDeclaration: PrescriptionDeclaration | null;
}

/**
 * Criminal case. Has offenses and no counterparty. Every offense carries its
 * prescription date from the moment the case exists: the ones that still lack it
 * (a case being registered) are calculated when the case is built.
 */
export class CriminalCase extends Case {
  private constructor(private readonly criminalProps: CriminalCaseProps) {
    super(criminalProps);
    for (const offense of criminalProps.offenses) {
      if (offense.prescriptionExpiresOn === null) {
        offense.calculatePrescription();
      }
    }
  }

  /** Rebuilds a {@link CriminalCase} from persisted data, without validation. */
  static hydrate(props: CriminalCaseProps): CriminalCase {
    return new CriminalCase(props);
  }

  /**
   * Marks the case as prescribed (HU33). The rules go in this order, the
   * business before the data, so a refused request changes nothing:
   *
   * 1. A closed case — "Prescripta" or "Archivada" — admits no new marking
   *    (CA-33.8, CA-33.12).
   * 2. A criminal case without legal qualifications cannot prescribe (D-74, CA-33.9).
   * 3. The data of the form make a valid declaration (CA-33.3).
   *
   * The computed term is **not** required to be met (CA-33.10): the court
   * declares it. The case moves to "Prescripta" with no current act, so its open
   * deadline closes (CA-33.4); it is not given de baja (CA-33.7).
   * @throws CaseInTerminalStateError
   * @throws PrescriptionNotApplicableError
   * @throws ValidationError
   */
  override declarePrescription(input: DeclarePrescriptionInput): void {
    if (this.criminalProps.prescriptionDeclaration !== null) {
      throw new CaseInTerminalStateError(CaseInTerminalStateError.FOR_THIS_OPERATION);
    }
    this.assertAcceptsActs(CaseInTerminalStateError.FOR_THIS_OPERATION);
    if (this.criminalProps.offenses.length === 0) {
      throw new PrescriptionNotApplicableError(PrescriptionNotApplicableError.WITHOUT_QUALIFICATIONS);
    }
    const state = this.prescribedStateOf(input.prescribedState);

    const declaration = PrescriptionDeclaration.create(input.data, {
      registeredByUserId: input.actor.userId,
      registeredAt: input.now,
      today: input.today,
    });

    // D-113, CA-33.17: "Marcar toda la causa" declares the offenses still pending;
    // the ones already declared keep their own declaration.
    for (const offense of this.criminalProps.offenses) {
      if (offense.prescriptionDeclaration === null) {
        offense.declarePrescription(declaration);
      }
    }
    this.criminalProps.prescriptionDeclaration = declaration;
    this.closeInState(state.id, input.now);
  }

  /**
   * D-113 — declares one legal qualification of the case prescribed (HU33
   * revised). Each offense prescribes on its own: the case stays open for the
   * others, and moves to "Prescripta" when the one declared was the **last**
   * pending one (CA-33.4). The rules go in the contract's order, the business
   * before the data, so a refused request changes nothing:
   *
   * 1. The case registers that qualification (`404`).
   * 2. The case is not closed (`422`, CA-33.8).
   * 3. The qualification was not declared already (`422`, CA-33.8).
   * 4. The data of the form make a valid declaration (`400`, CA-33.3).
   *
   * As for the whole case, the computed term is not required to be met
   * (CA-33.10): the court declares it.
   * @throws LegalQualificationNotInCaseError
   * @throws CaseInTerminalStateError
   * @throws LegalQualificationAlreadyPrescribedError
   * @throws ValidationError
   */
  override declareQualificationPrescription(input: DeclareQualificationPrescriptionInput): void {
    const offense = this.criminalProps.offenses.find(
      (candidate) => candidate.legalQualificationId === input.legalQualificationId,
    );
    if (!offense) {
      throw new LegalQualificationNotInCaseError();
    }
    if (this.criminalProps.prescriptionDeclaration !== null) {
      throw new CaseInTerminalStateError(CaseInTerminalStateError.FOR_THIS_OPERATION);
    }
    this.assertAcceptsActs(CaseInTerminalStateError.FOR_THIS_OPERATION);
    if (offense.prescriptionDeclaration !== null) {
      throw new LegalQualificationAlreadyPrescribedError();
    }

    const closesTheCase = this.criminalProps.offenses.every(
      (other) => other === offense || other.prescriptionDeclaration !== null,
    );
    const state = closesTheCase ? this.prescribedStateOf(input.prescribedState) : null;
    const declaration = PrescriptionDeclaration.create(input.data, {
      registeredByUserId: input.actor.userId,
      registeredAt: input.now,
      today: input.today,
    });

    offense.declarePrescription(declaration);
    if (state === null) {
      this.props.updatedAt = input.now;
      return;
    }
    this.criminalProps.prescriptionDeclaration = declaration;
    this.closeInState(state.id, input.now);
  }

  /** The "Prescripta" state of the criminal jurisdiction (D-53): the seed creates it, so its absence is broken data. */
  private prescribedStateOf(state: ProceduralStateRef | null): ProceduralStateRef {
    if (state === null || !state.isPrescribed || state.jurisdictionId !== this.jurisdictionId) {
      throw new Error(`The jurisdiction of case ${this.id} has no "Prescripta" state to move it to.`);
    }
    return state;
  }

  /**
   * A prescribed case keeps its qualifications: changing them would change the
   * prescription a court already declared (D-96, CA-19.13). Every other datum
   * of a terminal case can still be corrected.
   */
  protected override assertCanBeModifiedWith(changes: CaseChanges): void {
    if (changes.legalQualifications !== undefined && this.criminalProps.prescriptionDeclaration !== null) {
      throw new CaseInTerminalStateError(CaseInTerminalStateError.FOR_THIS_OPERATION);
    }
    // D-113, CA-33.18: an offense declared prescribed stays, with its offense date.
    const items = changes.legalQualifications;
    if (items === undefined) {
      return;
    }
    for (const declared of this.criminalProps.offenses.filter((offense) => offense.prescriptionDeclaration !== null)) {
      const kept = (items ?? []).some(
        (item) =>
          item.legalQualificationId === declared.legalQualificationId &&
          item.offenseDate instanceof Date &&
          item.offenseDate.getTime() === declared.offenseDate.getTime(),
      );
      if (!kept) {
        throw new LegalQualificationAlreadyPrescribedError(LegalQualificationAlreadyPrescribedError.FOR_MODIFYING);
      }
    }
  }

  /**
   * HU28 — "Prescripta" was not set by an act (D-54), so correcting an act cannot
   * take the case out of it (D-99, CA-28.9).
   */
  override assertActsCanBeModified(): void {
    if (this.criminalProps.prescriptionDeclaration !== null) {
      throw new CaseInTerminalStateError(CaseInTerminalStateError.ACTS_OF_PRESCRIBED_CASE);
    }
  }

  protected ownFields(): readonly CaseField[] {
    return ['legalQualifications', 'clientDetained'];
  }

  /**
   * The qualifications **replace** the whole list, and `[]` leaves the case
   * without any (CA-19.11). Each new offense gets its prescription date as in
   * the registration; the interruptive acts keep ruling on every read, since
   * nothing computed is stored (§4, Prescripción).
   */
  protected validateOwnChanges(
    changes: CaseChanges,
    context: CaseModificationContext,
    errors: FieldErrors,
  ): PendingChanges {
    let offenses: Offense[] | null = null;
    if (changes.legalQualifications === null) {
      errors.legalQualifications = 'Enviá la lista de calificaciones: [] deja la causa sin ninguna.';
    } else if (changes.legalQualifications !== undefined) {
      offenses = CaseDataRules.checkQualifications(
        errors,
        changes.legalQualifications,
        context.legalQualificationRefs,
        context.today,
      );
    }
    if (changes.clientDetained === null) {
      errors.clientDetained = CaseDataRules.CANNOT_BE_EMPTIED;
    }

    return () => {
      const changed: CaseField[] = [];
      if (offenses !== null && !CriminalCase.sameOffenses(this.criminalProps.offenses, offenses)) {
        // A declared offense is kept as it is, declaration included (D-113): it cannot be changed.
        this.criminalProps.offenses = offenses.map(
          (next) =>
            this.criminalProps.offenses.find(
              (current) =>
                current.prescriptionDeclaration !== null && current.legalQualificationId === next.legalQualificationId,
            ) ?? next,
        );
        changed.push('legalQualifications');
      }
      if (changes.clientDetained !== undefined) {
        Case.track(changed, 'clientDetained', this.criminalProps.clientDetained, changes.clientDetained, () => {
          this.criminalProps.clientDetained = changes.clientDetained!;
        });
      }
      return changed;
    };
  }

  /** The same qualifications with the same dates, in any order. */
  private static sameOffenses(current: readonly Offense[], next: readonly Offense[]): boolean {
    const key = (offense: Offense) => `${offense.legalQualificationId}@${offense.offenseDate.getTime()}`;
    const currentKeys = new Set(current.map(key));
    return current.length === next.length && next.every((offense) => currentKeys.has(key(offense)));
  }

  override get qualificationsPendingPrescription(): number[] {
    return this.criminalProps.offenses
      .filter((offense) => offense.prescriptionDeclaration === null)
      .map((offense) => offense.legalQualificationId);
  }

  override get prescriptionDeclaration(): PrescriptionDeclaration | null {
    return this.criminalProps.prescriptionDeclaration;
  }

  resolveCountsFrom(actDate: Date, notificationDate: Date | null, _stateOpensTerm: boolean): Date {
    return this.countsFromActDate(actDate, notificationDate);
  }

  toSnapshot(): CaseSnapshot {
    return {
      ...this.commonSnapshot(),
      clientDetained: this.criminalProps.clientDetained,
      offenses: this.criminalProps.offenses.map((offense) => offense.toSnapshot()),
    };
  }

  get jurisdictionCode(): JurisdictionCode {
    return JurisdictionCode.CRIMINAL;
  }

  /** A copy: the offenses of a case are not edited from outside. */
  get offenses(): readonly Offense[] {
    return [...this.criminalProps.offenses];
  }

  get clientDetained(): boolean {
    return this.criminalProps.clientDetained;
  }
}
