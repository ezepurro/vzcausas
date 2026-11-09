/** Interruptive act resource (contract V4 §3.9). Dates go out as `YYYY-MM-DD`, except `registeredAt`. */
export class InterruptiveActRegisteredByResponseDto {
  id!: number;
  lastName!: string;
  firstName!: string;
}

export class InterruptiveActResponseDto {
  id!: number;
  caseId!: number;
  name!: string;
  actDate!: string;
  notes!: string | null;
  registeredBy!: InterruptiveActRegisteredByResponseDto;
  registeredAt!: string;
}
