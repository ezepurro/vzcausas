import { JurisdictionCode } from '../value-objects/jurisdiction-code';
import { CaseSnapshot } from './case-snapshot';
import { Case, CaseProps } from './cases';
import { Offense } from './offense';

export interface CriminalCaseProps extends CaseProps {
  // May be empty (D-33): the case then has no prescription to compute.
  offenses: Offense[];
  // Whether the client is in custody (D-67). Only in this jurisdiction.
  clientDetained: boolean;
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
