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
  @IsString()
  proceduralStateId?: string;

  @IsOptional()
  @IsString()
  actDate?: string;

  @IsOptional()
  @IsString()
  notificationDate?: string;
}
