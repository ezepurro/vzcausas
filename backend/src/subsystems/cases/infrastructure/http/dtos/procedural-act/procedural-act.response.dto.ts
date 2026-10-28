import { DayType } from '../../../../core/domain/value-objects/deadline/day-type';

/** Dates go out as `YYYY-MM-DD` strings, except `registeredAt`, which carries the time and offset. */
export class ResultingStateResponseDto {
  proceduralStateId!: number | null;
  name!: string;
  custom!: boolean;
}

export class ProceduralActDeadlineResponseDto {
  timeLimitDays!: number;
  dayType!: DayType;
  countsFrom!: string;
  computedDueDate!: string | null;
  dueDate!: string | null;
  manuallyAdjusted!: boolean;
  // Days the manual due date gives, in `dayType`. `null` if not adjusted or `NONE` (D-86).
  manualTimeLimitDays!: number | null;
}

export class RegisteredByResponseDto {
  id!: number;
  lastName!: string;
  firstName!: string;
}

export class ProceduralActResponseDto {
  id!: number;
  caseId!: number;
  resultingState!: ResultingStateResponseDto;
  actDate!: string;
  notificationDate!: string | null;
  notes!: string | null;
  // `null` if the act opens no term and has no due date entered by hand.
  deadline!: ProceduralActDeadlineResponseDto | null;
  registeredBy!: RegisteredByResponseDto;
  registeredAt!: string;
}
