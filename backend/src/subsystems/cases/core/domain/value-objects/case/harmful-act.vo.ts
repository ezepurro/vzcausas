import { addBusinessDays, addConsecutiveDays, businessDaysRemaining } from '../../business-days';
import { DayType } from '../deadline/day-type';

/**
 * The harmful act of an amparo (D-67): the act the amparo is filed against.
 * From its date runs the term to file the amparo (D-78).
 *
 * `termDays` and `termDayType` exist if and only if there is a date, and the
 * renewal days if and only if the act renews: the same coherence the
 * `ck_cases_harmful_act_*` constraints of the database enforce. Immutable.
 */
export interface HarmfulActProps {
  date: Date;
  renews: boolean;
  // Calendar days between renewals. Present if and only if `renews`.
  renewalDays: number | null;
  termDays: number;
  // `BUSINESS` or `CONSECUTIVE`, never `NONE`.
  termDayType: DayType;
}

/** The term to file the amparo, as of a given day (contract §3.7, `harmfulActDeadline`). */
export interface HarmfulActDeadline {
  // The date the term counts from: the one loaded or, if the act renews, the latest renewal not after today.
  actDate: Date;
  // `true` if `actDate` is a renewal and not the date that was loaded.
  renewed: boolean;
  dueDate: Date;
  businessDaysRemaining: number;
}

export class HarmfulAct {
  private constructor(private readonly props: HarmfulActProps) {}

  /** Builds a harmful act from data that the factory already validated. */
  static create(props: HarmfulActProps): HarmfulAct {
    return new HarmfulAct(props);
  }

  /**
   * The deadline to file the amparo (D-78). With renewal, the latest renewal
   * that does not go past `today` is taken as the act date: renewals are
   * calculated and not stored, so the loaded date never changes.
   *
   * It does not know whether the case already left the initial state: the
   * first procedural act says the amparo was filed, and then there is no
   * deadline. That is for the caller to decide.
   */
  deadline(today: Date): HarmfulActDeadline {
    const { actDate, renewed } = this.currentActDate(today);
    const dueDate =
      this.props.termDayType === DayType.CONSECUTIVE
        ? addConsecutiveDays(actDate, this.props.termDays)
        : addBusinessDays(actDate, this.props.termDays);
    return { actDate, renewed, dueDate, businessDaysRemaining: businessDaysRemaining(today, dueDate) };
  }

  private currentActDate(today: Date): { actDate: Date; renewed: boolean } {
    const { date, renews, renewalDays } = this.props;
    if (!renews || renewalDays === null || today < date) {
      return { actDate: date, renewed: false };
    }
    const elapsedDays = Math.round((today.getTime() - date.getTime()) / (24 * 60 * 60 * 1000));
    const renewals = Math.floor(elapsedDays / renewalDays);
    return { actDate: addConsecutiveDays(date, renewals * renewalDays), renewed: renewals > 0 };
  }

  get date(): Date {
    return this.props.date;
  }

  get renews(): boolean {
    return this.props.renews;
  }

  get renewalDays(): number | null {
    return this.props.renewalDays;
  }

  get termDays(): number {
    return this.props.termDays;
  }

  get termDayType(): DayType {
    return this.props.termDayType;
  }
}
