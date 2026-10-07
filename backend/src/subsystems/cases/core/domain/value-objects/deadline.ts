import { ValidationError } from '@shared/domain/domain-error';
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
        manualDueDate: 'No puede ser anterior a la fecha desde la que corre el plazo.',
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

  /** `true` if the state of the act opens a term in the table. */
  opensTerm(): boolean {
    return this.props.timeLimitDays > 0;
  }
}
