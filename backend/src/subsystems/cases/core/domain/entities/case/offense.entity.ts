import { LegalQualificationRef } from '../../ports/case/legal-parameters-lookup.port';
import { addPrescriptionMonths } from '../../prescription';
import { PrescriptionDeclaration } from '../../value-objects/prescription/prescription-declaration.vo';
import { OffenseSnapshot } from './case-snapshot';

export interface OffenseProps {
  legalQualification: LegalQualificationRef;
  offenseDate: Date;
  // Null until `calculatePrescription()` runs.
  prescriptionExpiresOn: Date | null;
  // The declaration that this offense prescribed (D-113). Absent or null until a court declared it.
  prescriptionDeclaration?: PrescriptionDeclaration | null;
}

/**
 * Offense (hecho): a legal qualification assigned to a criminal case. It has
 * its own offense date, and its prescription date is calculated from that date
 * and from the prescription months of the legal qualification it is based on.
 */
export class Offense {
  private constructor(private readonly props: OffenseProps) {}

  static hydrate(props: OffenseProps): Offense {
    return new Offense(props);
  }

  get legalQualificationId(): number {
    return this.props.legalQualification.id;
  }

  get legalQualificationName(): string {
    return this.props.legalQualification.name;
  }

  get prescriptionMonths(): number {
    return this.props.legalQualification.prescriptionMonths;
  }

  get offenseDate(): Date {
    return this.props.offenseDate;
  }

  /**
   * Date from which the prescription counts, **at registration**: a case that is
   * being registered has no interruptive acts yet, so it is the offense date.
   * Later acts move it on every read of the case (HU31, `prescription.ts`).
   */
  get prescriptionStartsOn(): Date {
    return this.props.offenseDate;
  }

  /** The declaration that this offense prescribed (D-113, HU33); `null` while it was not declared. */
  get prescriptionDeclaration(): PrescriptionDeclaration | null {
    return this.props.prescriptionDeclaration ?? null;
  }

  /**
   * Records that a court declared this offense prescribed (D-113). Once, and
   * for good: whether it may be declared is the case's rule
   * (`CriminalCase.declareQualificationPrescription`), and here an offense
   * already declared is a broken invariant.
   */
  declarePrescription(declaration: PrescriptionDeclaration): void {
    if (this.prescriptionDeclaration !== null) {
      throw new Error(`The offense of the qualification ${this.legalQualificationId} was already declared prescribed.`);
    }
    this.props.prescriptionDeclaration = declaration;
  }

  /** The prescription date, or `null` if it was not calculated yet. */
  get prescriptionExpiresOn(): Date | null {
    return this.props.prescriptionExpiresOn;
  }

  /**
   * The offense as plain data. Its prescription date has to be calculated by
   * then: `CriminalCase` does it when the case is built, so an offense without
   * it here is a broken invariant, not a value to pass on (V4 §3.7 defines
   * `prescriptionExpiresOn` as non-null).
   */
  toSnapshot(): OffenseSnapshot {
    const prescriptionExpiresOn = this.prescriptionExpiresOn;
    if (prescriptionExpiresOn === null) {
      throw new Error(`The offense of the qualification ${this.legalQualificationId} has no prescription date.`);
    }
    return {
      legalQualificationId: this.legalQualificationId,
      legalQualificationName: this.legalQualificationName,
      prescriptionMonths: this.prescriptionMonths,
      offenseDate: this.offenseDate,
      prescriptionStartsOn: this.prescriptionStartsOn,
      prescriptionExpiresOn,
      prescriptionDeclaration: this.prescriptionDeclaration,
    };
  }

  /** Calculates the prescription date (start plus months) and keeps it. A shorter month ends on its last day. */
  calculatePrescription(): void {
    this.props.prescriptionExpiresOn = addPrescriptionMonths(this.prescriptionStartsOn, this.prescriptionMonths);
  }
}
