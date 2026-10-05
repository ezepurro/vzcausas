import { CaseLegalQualification } from '../value-objects/case-legal-qualification';
import { JurisdictionCode } from '../value-objects/jurisdiction-code';
import { Case, CaseProps } from './cases';

export interface CriminalCaseProps extends CaseProps {
  // May be empty (D-33): the case then has no prescription to compute.
  legalQualifications: CaseLegalQualification[];
}

/** Criminal case. Has legal qualifications and no counterparty. */
export class CriminalCase extends Case {
  private constructor(private readonly criminalProps: CriminalCaseProps) {
    super(criminalProps);
  }

  /** Rebuilds a {@link CriminalCase} from persisted data, without validation. */
  static hydrate(props: CriminalCaseProps): CriminalCase {
    return new CriminalCase(props);
  }

  get jurisdictionCode(): JurisdictionCode {
    return JurisdictionCode.CRIMINAL;
  }

  get legalQualifications(): CaseLegalQualification[] {
    return this.criminalProps.legalQualifications;
  }
}
