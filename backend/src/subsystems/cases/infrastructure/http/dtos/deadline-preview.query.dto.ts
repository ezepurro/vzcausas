import { IsOptional, IsString } from 'class-validator';

/**
 * Query parameters of `GET /cases/{caseId}/procedural-acts/deadline-preview`
 * (API contract §3.8).
 *
 * They are only checked to be strings here. Whether they are a valid id or
 * date is answered with the contract's `INVALID_REQUEST`, which names the
 * offending parameter in `details`; the global pipe would answer
 * `VALIDATION_ERROR` instead (same approach as `ListUsersQueryDto`).
 */
export class DeadlinePreviewQueryDto {
  @IsOptional()
  @IsString({ message: 'Debe ser un texto.' })
  proceduralStateId?: string;

  @IsOptional()
  @IsString({ message: 'Debe ser un texto.' })
  actDate?: string;

  @IsOptional()
  @IsString({ message: 'Debe ser un texto.' })
  notificationDate?: string;
}
