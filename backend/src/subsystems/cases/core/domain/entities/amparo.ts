import { DayType } from '../value-objects/day-type';
import { HarmfulAct, HarmfulActDeadline } from '../value-objects/harmful-act';
import { JurisdictionCode } from '../value-objects/jurisdiction-code';
import { CaseSnapshot } from './case-snapshot';
import { Case, CaseProps } from './cases';

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
