import { ValidationError } from '@shared/domain/domain-error';
import { JurisdictionCode } from '../value-objects/jurisdiction-code';
import { Case, CaseProps } from './cases';

export interface AdministrativeCaseProps extends CaseProps {
  counterparty: string | null;
  // Reason the case is started, written by the lawyer. Required here.
  subjectMatter: string;
  // Date the administrative remedy was exhausted (D-67). Null while it was not. Only in this jurisdiction.
  administrativeRemedyExhaustedOn: Date | null;
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

  /** The term runs from the notification, which is required if the state opens one (RN6, CA-26.4). */
  resolveCountsFrom(actDate: Date, notificationDate: Date | null, stateOpensTerm: boolean): Date {
    if (notificationDate !== null) {
      return notificationDate;
    }
    if (stateOpensTerm) {
      throw new ValidationError('VALIDATION_ERROR', 'Los datos enviados no son válidos.', {
        notificationDate: 'Es obligatoria en el fuero administrativo cuando el estado abre plazo (RN6).',
      });
    }
    // A state without a term needs no notification; a manual due date counts from the act.
    return actDate;
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

  get administrativeRemedyExhaustedOn(): Date | null {
    return this.administrativeProps.administrativeRemedyExhaustedOn;
  }
}
