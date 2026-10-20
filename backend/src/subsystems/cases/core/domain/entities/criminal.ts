import { JurisdictionCode } from '../value-objects/jurisdiction-code';
import { Case, CaseProps } from './cases';
import { Offense } from './offense';

export interface CriminalCaseProps extends CaseProps {
  // May be empty (D-33): the case then has no prescription to compute.
  offenses: Offense[];
  // Whether the client is in custody (D-67). Only in this jurisdiction.
  clientDetained: boolean;
}

/** Criminal case. Has offenses and no counterparty. */
export class CriminalCase extends Case {
  private constructor(private readonly criminalProps: CriminalCaseProps) {
    super(criminalProps);
  }

  /** Rebuilds a {@link CriminalCase} from persisted data, without validation. */
  static hydrate(props: CriminalCaseProps): CriminalCase {
    return new CriminalCase(props);
  }

  resolveCountsFrom(actDate: Date, notificationDate: Date | null, _stateOpensTerm: boolean): Date {
    return this.countsFromActDate(actDate, notificationDate);
  }

  get jurisdictionCode(): JurisdictionCode {
    return JurisdictionCode.CRIMINAL;
  }

  get offenses(): Offense[] {
    return this.criminalProps.offenses;
  }

  get clientDetained(): boolean {
    return this.criminalProps.clientDetained;
  }
}
