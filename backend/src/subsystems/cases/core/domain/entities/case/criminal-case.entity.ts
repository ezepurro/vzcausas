import { CaseInTerminalStateError, PrescriptionNotApplicableError } from '../../errors/case.errors';
import { CaseDataRules, FieldErrors } from '../../rules/case-data-rules';
import { CaseChanges, CaseField, CaseModificationContext, PendingChanges } from './case-changes';
import { JurisdictionCode } from '../../value-objects/case/jurisdiction-code';
import { PrescriptionDeclaration } from '../../value-objects/prescription/prescription-declaration.vo';
import { CaseSnapshot } from './case-snapshot';
import { Case, CaseProps, DeclarePrescriptionInput } from './case.entity';
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

    const state = input.prescribedState;
    if (state === null || !state.isPrescribed || state.jurisdictionId !== this.jurisdictionId) {
      // The seed creates "Prescripta" for the criminal jurisdiction (D-53): its absence is broken data.
      throw new Error(`The jurisdiction of case ${this.id} has no "Prescripta" state to move it to.`);
    }

    const declaration = PrescriptionDeclaration.create(input.data, {
      registeredByUserId: input.actor.userId,
      registeredAt: input.now,
      today: input.today,
    });

    this.criminalProps.prescriptionDeclaration = declaration;
    this.closeInState(state.id, input.now);
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
        this.criminalProps.offenses = offenses;
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
