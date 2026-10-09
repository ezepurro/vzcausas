import { DayType } from '../../../core/domain/value-objects/day-type';

/** Dates go out as `YYYY-MM-DD` strings, as the contract defines them. */
export class DeadlinePreviewResponseDto {
  proceduralStateId!: number;
  timeLimitDays!: number;
  dayType!: DayType;
  countsFrom!: string;
  // `null` when the state opens no term.
  dueDate!: string | null;
  businessDaysRemaining!: number | null;
}
