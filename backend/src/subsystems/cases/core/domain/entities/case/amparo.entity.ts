import { DayType } from '../../value-objects/deadline/day-type';
import { HarmfulAct, HarmfulActDeadline } from '../../value-objects/case/harmful-act.vo';
import { CaseDataRules, FieldErrors, HarmfulActData } from '../../rules/case-data-rules';
import { JurisdictionCode } from '../../value-objects/case/jurisdiction-code';
import { CaseChanges, CaseField, CaseModificationContext, PendingChanges } from './case-changes';
import { CaseSnapshot } from './case-snapshot';
import { Case, CaseProps } from './case.entity';

export interface AmparoProps extends CaseProps {
  counterparty: string | null;
  // Reason the case is started, written by the lawyer. Required here.
  subjectMatter: string;
  // Whether the judge granted the injunction (D-67). Only in this jurisdiction.
  injunctionGranted: boolean;
  // The harmful act the amparo is filed against (D-67, D-78). Date of the act; null if it was not loaded.
  harmfulActDate: Date | null;
  harmfulActRenews: boolean;
  // Calendar days between renewals. Present if and only if the act renews.
  harmfulActRenewalDays: number | null;
  // Term to file the amparo. Present if and only if there is a date.
  harmfulActTermDays: number | null;
  harmfulActTermDayType: DayType | null;
}

/** Amparo case. Has a counterparty, a subject matter and the harmful act that starts its term. */
export class Amparo extends Case {
  private constructor(private readonly amparoProps: AmparoProps) {
    super(amparoProps);
  }

  /** Rebuilds an {@link Amparo} from persisted data, without validation. */
  static hydrate(props: AmparoProps): Amparo {
    return new Amparo(props);
  }

  resolveCountsFrom(actDate: Date, notificationDate: Date | null, _stateOpensTerm: boolean): Date {
    return this.countsFromActDate(actDate, notificationDate);
  }

  protected ownFields(): readonly CaseField[] {
    return [
      'counterparty',
      'subjectMatter',
      'injunctionGranted',
      'harmfulActDate',
      'harmfulActRenews',
      'harmfulActRenewalDays',
      'harmfulActTermDays',
      'harmfulActTermDayType',
    ];
  }

  /**
   * Counterparty and subject matter as in the registration. The harmful act is
   * checked as it would end up, with the rules of the registration, so its
   * deadline is recomputed on the next read (CA-19.12). `harmfulActDate: null`
   * deletes the act and, with it, every datum that hangs from it.
   */
  protected validateOwnChanges(
    changes: CaseChanges,
    context: CaseModificationContext,
    errors: FieldErrors,
  ): PendingChanges {
    const props = this.amparoProps;
    const counterparty =
      changes.counterparty !== undefined ? CaseDataRules.checkCounterparty(errors, changes.counterparty) : props.counterparty;
    const subjectMatter =
      changes.subjectMatter !== undefined ? CaseDataRules.checkSubjectMatter(errors, changes.subjectMatter) : props.subjectMatter;
    if (changes.injunctionGranted === null) {
      errors.injunctionGranted = CaseDataRules.CANNOT_BE_EMPTIED;
    }
    if (changes.harmfulActRenews === null) {
      errors.harmfulActRenews = CaseDataRules.CANNOT_BE_EMPTIED;
    }

    const harmfulAct = this.harmfulActAfter(changes, context.today, errors);

    return () => {
      const changed: CaseField[] = [];
      Case.track(changed, 'counterparty', props.counterparty, counterparty, () => (props.counterparty = counterparty));
      Case.track(changed, 'subjectMatter', props.subjectMatter, subjectMatter, () => {
        props.subjectMatter = subjectMatter as string;
      });
      if (changes.injunctionGranted !== undefined) {
        Case.track(changed, 'injunctionGranted', props.injunctionGranted, changes.injunctionGranted, () => {
          props.injunctionGranted = changes.injunctionGranted!;
        });
      }
      if (harmfulAct !== null) {
        Case.track(changed, 'harmfulActDate', props.harmfulActDate, harmfulAct.date, () => (props.harmfulActDate = harmfulAct.date));
        Case.track(changed, 'harmfulActRenews', props.harmfulActRenews, harmfulAct.renews, () => {
          props.harmfulActRenews = harmfulAct.renews;
        });
        Case.track(changed, 'harmfulActRenewalDays', props.harmfulActRenewalDays, harmfulAct.renewalDays, () => {
          props.harmfulActRenewalDays = harmfulAct.renewalDays;
        });
        Case.track(changed, 'harmfulActTermDays', props.harmfulActTermDays, harmfulAct.termDays, () => {
          props.harmfulActTermDays = harmfulAct.termDays;
        });
        Case.track(changed, 'harmfulActTermDayType', props.harmfulActTermDayType, harmfulAct.termDayType, () => {
          props.harmfulActTermDayType = harmfulAct.termDayType;
        });
      }
      return changed;
    };
  }

  /**
   * The harmful act as the modification would leave it, already validated, or
   * `null` if none of its fields was sent. A field left out keeps its value,
   * except when the date is emptied: then the rest goes with it unless sent.
   */
  private harmfulActAfter(changes: CaseChanges, today: Date, errors: FieldErrors): HarmfulActData | null {
    const fields = [
      'harmfulActDate',
      'harmfulActRenews',
      'harmfulActRenewalDays',
      'harmfulActTermDays',
      'harmfulActTermDayType',
    ] as const;
    if (fields.every((field) => changes[field] === undefined)) {
      return null;
    }

    const props = this.amparoProps;
    const deleted = changes.harmfulActDate === null;
    const pick = <T>(sent: T | null | undefined, current: T | null, cleared: T | null): T | null =>
      sent !== undefined ? sent : deleted ? cleared : current;

    return CaseDataRules.checkHarmfulAct(
      errors,
      {
        date: pick(changes.harmfulActDate, props.harmfulActDate, null),
        renews: pick(changes.harmfulActRenews, props.harmfulActRenews, false) ?? false,
        renewalDays: pick(changes.harmfulActRenewalDays, props.harmfulActRenewalDays, null),
        termDays: pick(changes.harmfulActTermDays, props.harmfulActTermDays, null),
        termDayType: pick(changes.harmfulActTermDayType, props.harmfulActTermDayType, null),
      },
      today,
    );
  }

  toSnapshot(): CaseSnapshot {
    return {
      ...this.commonSnapshot(),
      counterparty: this.amparoProps.counterparty,
      subjectMatter: this.amparoProps.subjectMatter,
      injunctionGranted: this.amparoProps.injunctionGranted,
      harmfulActDate: this.amparoProps.harmfulActDate,
      harmfulActRenews: this.amparoProps.harmfulActRenews,
      harmfulActRenewalDays: this.amparoProps.harmfulActRenewalDays,
      harmfulActTermDays: this.amparoProps.harmfulActTermDays,
      harmfulActTermDayType: this.amparoProps.harmfulActTermDayType,
    };
  }

  override harmfulActDeadline(today: Date): HarmfulActDeadline | null {
    return this.harmfulAct?.deadline(today) ?? null;
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

  get injunctionGranted(): boolean {
    return this.amparoProps.injunctionGranted;
  }

  get harmfulActDate(): Date | null {
    return this.amparoProps.harmfulActDate;
  }

  get harmfulActRenews(): boolean {
    return this.amparoProps.harmfulActRenews;
  }

  get harmfulActRenewalDays(): number | null {
    return this.amparoProps.harmfulActRenewalDays;
  }

  get harmfulActTermDays(): number | null {
    return this.amparoProps.harmfulActTermDays;
  }

  get harmfulActTermDayType(): DayType | null {
    return this.amparoProps.harmfulActTermDayType;
  }

  /** The harmful act with its term, or `null` while its date was not loaded. */
  get harmfulAct(): HarmfulAct | null {
    const { harmfulActDate, harmfulActTermDays, harmfulActTermDayType } = this.amparoProps;
    if (harmfulActDate === null || harmfulActTermDays === null || harmfulActTermDayType === null) {
      return null;
    }
    return HarmfulAct.create({
      date: harmfulActDate,
      renews: this.amparoProps.harmfulActRenews,
      renewalDays: this.amparoProps.harmfulActRenewalDays,
      termDays: harmfulActTermDays,
      termDayType: harmfulActTermDayType,
    });
  }
}
