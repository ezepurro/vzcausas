import { LegalQualificationRef } from '../ports/legal-parameters-lookup.port';

export interface OffenseProps {
  legalQualification: LegalQualificationRef;
  offenseDate: Date;
  // Null until `calculatePrescription()` runs.
  prescriptionExpiresOn: Date | null;
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

  /** Date from which the prescription counts. Until interruptive acts exist, it is the offense date. */
  get prescriptionStartsOn(): Date {
    return this.props.offenseDate;
  }

  /** The prescription date, or `null` if it was not calculated yet. */
  get prescriptionExpiresOn(): Date | null {
    return this.props.prescriptionExpiresOn;
  }

  /** Calculates the prescription date (start plus months) and keeps it. A shorter month ends on its last day. */
  calculatePrescription(): void {
    const start = this.prescriptionStartsOn;
    const year = start.getUTCFullYear();
    const month = start.getUTCMonth() + this.prescriptionMonths;
    const lastDayOfMonth = new Date(Date.UTC(year, month + 1, 0)).getUTCDate();
    this.props.prescriptionExpiresOn = new Date(Date.UTC(year, month, Math.min(start.getUTCDate(), lastDayOfMonth)));
  }
}
