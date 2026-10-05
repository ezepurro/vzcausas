import { JurisdictionCode } from '../value-objects/jurisdiction-code';
import { Case, CaseProps } from './cases';

export interface AdministrativeCaseProps extends CaseProps {
  counterparty: string | null;
  // Reason the case is started, written by the lawyer. Required here.
  subjectMatter: string;
}

/** Administrative case. Has a counterparty and a subject matter. */
export class AdministrativeCase extends Case {
  private constructor(private readonly administrativeProps: AdministrativeCaseProps) {
    super(administrativeProps);
  }

  /** Rebuilds an {@link AdministrativeCase} from persisted data, without validation. */
  static hydrate(props: AdministrativeCaseProps): AdministrativeCase {
    return new AdministrativeCase(props);
  }

  get jurisdictionCode(): JurisdictionCode {
    return JurisdictionCode.ADMINISTRATIVE;
  }

  get counterparty(): string | null {
    return this.administrativeProps.counterparty;
  }

  get subjectMatter(): string {
    return this.administrativeProps.subjectMatter;
  }
}
