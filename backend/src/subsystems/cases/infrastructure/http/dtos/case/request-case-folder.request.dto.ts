import { IsBoolean, IsOptional } from 'class-validator';

/** Request body of `POST /cases/{caseId}/folder` (API contract). The body may be omitted. */
export class RequestCaseFolderRequestDto {
  // Copy the formal templates into the folder (HU40, not implemented yet). Defaults to `true`.
  @IsOptional()
  @IsBoolean({ message: 'Debe ser true o false.' })
  copyTemplates?: boolean;
}
