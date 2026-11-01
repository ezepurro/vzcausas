import { ValidationError } from '@shared/domain/domain-error';
import { CaseDataRules, FieldErrors } from '../../rules/case-data-rules';
import { JurisdictionCode } from '../../value-objects/case/jurisdiction-code';
import { CaseChanges, CaseField, CaseModificationContext, PendingChanges } from './case-changes';
import { CaseSnapshot } from './case-snapshot';
import { Case, CaseProps } from './case.entity';

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

  protected ownFields(): readonly CaseField[] {
    return ['counterparty', 'subjectMatter', 'administrativeRemedyExhaustedOn'];
  }

  /** Counterparty and subject matter as in the registration; the remedy date may be emptied (`null`: not exhausted). */
  protected validateOwnChanges(
    changes: CaseChanges,
    context: CaseModificationContext,
    errors: FieldErrors,
  ): PendingChanges {
    const props = this.administrativeProps;
    const counterparty =
      changes.counterparty !== undefined ? CaseDataRules.checkCounterparty(errors, changes.counterparty) : props.counterparty;
    const subjectMatter =
      changes.subjectMatter !== undefined ? CaseDataRules.checkSubjectMatter(errors, changes.subjectMatter) : props.subjectMatter;
    const remedy =
      changes.administrativeRemedyExhaustedOn !== undefined
        ? changes.administrativeRemedyExhaustedOn
        : props.administrativeRemedyExhaustedOn;
    if (changes.administrativeRemedyExhaustedOn) {
      CaseDataRules.checkPastDate(errors, 'administrativeRemedyExhaustedOn', remedy, context.today);
    }

    return () => {
      const changed: CaseField[] = [];
      Case.track(changed, 'counterparty', props.counterparty, counterparty, () => (props.counterparty = counterparty));
      Case.track(changed, 'subjectMatter', props.subjectMatter, subjectMatter, () => {
        props.subjectMatter = subjectMatter as string;
      });
      Case.track(changed, 'administrativeRemedyExhaustedOn', props.administrativeRemedyExhaustedOn, remedy, () => {
        props.administrativeRemedyExhaustedOn = remedy;
      });
      return changed;
    };
  }

  toSnapshot(): CaseSnapshot {
    return {
      ...this.commonSnapshot(),
      counterparty: this.administrativeProps.counterparty,
      subjectMatter: this.administrativeProps.subjectMatter,
      administrativeRemedyExhaustedOn: this.administrativeProps.administrativeRemedyExhaustedOn,
    };
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
