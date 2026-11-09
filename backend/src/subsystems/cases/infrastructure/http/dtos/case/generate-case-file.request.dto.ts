import { Type } from 'class-transformer';
import { IsArray, IsObject, IsOptional, IsString, ValidateNested } from 'class-validator';

/** `cover` of the request: what the cover sheet needs and the case does not have (D-92). */
export class CaseFileCoverRequestDto {
  @IsOptional()
  @IsString({ message: 'Debe ser un texto.' })
  notes?: string | null;

  @IsOptional()
  @IsString({ message: 'Debe ser un texto.' })
  opposingParty?: string | null;
}

/**
 * Request body of `POST /cases/{caseId}/case-files` (HU25, contract V5 §3.12).
 *
 * Only the types are checked here. That the list has at least one document and
 * none repeated, and the lengths of `cover`, are the domain's (`CaseFileRequest`),
 * so the answer carries the contract's texts and every wrong field at once. An
 * error inside `cover` is reported as `cover.notes`, the path the pipe builds.
 */
export class GenerateCaseFileRequestDto {
  @IsOptional()
  @IsArray({ message: 'Debe ser una lista de documentos.' })
  @IsString({ each: true, message: 'Cada documento debe ser un texto.' })
  documentIds?: string[];

  @IsOptional()
  @IsObject({ message: 'Debe ser un objeto.' })
  @ValidateNested()
  @Type(() => CaseFileCoverRequestDto)
  cover?: CaseFileCoverRequestDto | null;
}
