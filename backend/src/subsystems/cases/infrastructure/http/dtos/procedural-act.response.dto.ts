import { DayType } from '../../../core/domain/value-objects/day-type';

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
}

export class RegisteredByResponseDto {
  id!: number;
  fullName!: string;
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
