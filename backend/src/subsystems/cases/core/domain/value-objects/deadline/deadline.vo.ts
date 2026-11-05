import { ValidationError } from '@shared/domain/domain-error';
import { countBusinessDays, countConsecutiveDays } from '../../business-days';
import { DayType } from './day-type';

export interface DeadlineProps {
  timeLimitDays: number;
  dayType: DayType;
  // Date the term starts counting from: the notification date in ADMINISTRATIVE cases (RN6), the act date otherwise.
  countsFrom: Date;
  // Result of the state's time limit. Null if the state opens no term.
  computedDueDate: Date | null;
  // Set only if the lawyer adjusted the due date by hand.
  manualDueDate: Date | null;
}

/**
 * Deadline opened by a procedural act. A copy of the state's time limit
 * at registration time: changing the state later does not alter it (CA-26.6).
 * Immutable.
 */
export class Deadline {
  /** Shared with the modification of an act (HU28), which checks it together with the other fields. */
  static readonly MANUAL_BEFORE_COUNTS_FROM = 'No puede ser anterior a la fecha desde la que corre el plazo.';

  private constructor(private readonly props: DeadlineProps) {}

  /**
   * Builds the deadline of a new act.
   * @throws ValidationError if the manual due date is before the date the term counts from.
   * @throws Error if the table values are incoherent (a bug of the caller, not a user error).
   */
  static create(props: DeadlineProps): Deadline {
    if ((props.timeLimitDays === 0) !== (props.dayType === DayType.NONE)) {
      throw new Error('A deadline has zero days if and only if its day type is NONE.');
    }
    if ((props.timeLimitDays > 0) !== (props.computedDueDate !== null)) {
      throw new Error('A deadline has a computed due date if and only if its state opens a term.');
    }
    if (props.manualDueDate !== null && props.manualDueDate < props.countsFrom) {
      throw new ValidationError('VALIDATION_ERROR', 'Los datos enviados no son válidos.', {
        manualDueDate: Deadline.MANUAL_BEFORE_COUNTS_FROM,
      });
    }
    return new Deadline(props);
  }

  /** Rebuilds a {@link Deadline} from persisted data, without validation. */
  static hydrate(props: DeadlineProps): Deadline {
    return new Deadline(props);
  }

  get timeLimitDays(): number {
    return this.props.timeLimitDays;
  }

  get dayType(): DayType {
    return this.props.dayType;
  }

  get countsFrom(): Date {
    return this.props.countsFrom;
  }

  get computedDueDate(): Date | null {
    return this.props.computedDueDate;
  }

  get manualDueDate(): Date | null {
    return this.props.manualDueDate;
  }

  /** The current due date: the manual one if the lawyer adjusted it, else the computed one. */
  get dueDate(): Date | null {
    return this.props.manualDueDate ?? this.props.computedDueDate;
  }

  get manuallyAdjusted(): boolean {
    return this.props.manualDueDate !== null;
  }

  /**
   * Days of the term that the manual due date gives, counted from
   * `countsFrom` (excluded) to the manual date (included) in the act's
   * `dayType` (D-86). Business days follow the same incomplete rule as the
   * rest of the system: weekends only, no holidays (P-02). A manual date on a
   * non-business day counts like the business day before it.
   *
   * `null` if the due date was not adjusted by hand, or if the act has no
   * table term (`NONE`): without one there is no unit to count in.
   */
  get manualTimeLimitDays(): number | null {
    const { manualDueDate, countsFrom, dayType } = this.props;
    if (manualDueDate === null) {
      return null;
    }
    switch (dayType) {
      case DayType.BUSINESS:
        return countBusinessDays(countsFrom, manualDueDate);
      case DayType.CONSECUTIVE:
        return countConsecutiveDays(countsFrom, manualDueDate);
      case DayType.NONE:
        return null;
    }
  }

  /** `true` if the state of the act opens a term in the table. */
  opensTerm(): boolean {
    return this.props.timeLimitDays > 0;
  }
}
