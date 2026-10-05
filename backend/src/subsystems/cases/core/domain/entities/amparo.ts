import { JurisdictionCode } from '../value-objects/jurisdiction-code';
import { Case, CaseProps } from './cases';

export interface AmparoProps extends CaseProps {
  counterparty: string | null;
  // Reason the case is started, written by the lawyer. Required here.
  subjectMatter: string;
}

/** Amparo case. Has a counterparty and a subject matter. */
export class Amparo extends Case {
  private constructor(private readonly amparoProps: AmparoProps) {
    super(amparoProps);
  }

  /** Rebuilds an {@link Amparo} from persisted data, without validation. */
  static hydrate(props: AmparoProps): Amparo {
    return new Amparo(props);
  }

  get jurisdictionCode(): JurisdictionCode {
    return JurisdictionCode.AMPARO;
  }

  get counterparty(): string | null {
    return this.amparoProps.counterparty;
  }

  get subjectMatter(): string {
    return this.amparoProps.subjectMatter;
  }
}
