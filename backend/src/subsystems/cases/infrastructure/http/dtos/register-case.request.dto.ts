import { Type } from 'class-transformer';
import { IsArray, IsBoolean, IsDate, IsEnum, IsInt, IsOptional, IsString, ValidateNested } from 'class-validator';
import { DayType } from '../../../core/domain/value-objects/day-type';
import { JurisdictionCode } from '../../../core/domain/value-objects/jurisdiction-code';
import { ProceduralRole } from '../../../core/domain/value-objects/procedural-role';

export class LegalQualificationRequestDto {
  @IsInt()
  legalQualificationId!: number;

  @IsOptional()
  @Type(() => Date)
  @IsDate()
  offenseDate?: Date;
}

/**
 * Request body of `POST /cases` (API contract §3.7).
 *
 * Only the shape and the types are checked here. Lengths and business rules
 * are checked by the domain, which reports them by field as the contract shows.
 */
export class RegisterCaseRequestDto {
  @IsEnum(JurisdictionCode)
  jurisdiction!: JurisdictionCode;

  @IsOptional()
  @IsString()
  sacNumber?: string | null;

  @IsString()
  caption!: string;

  @IsOptional()
  @IsString()
  court?: string | null;

  @IsOptional()
  @IsString()
  instructorName?: string | null;

  @IsOptional()
  @IsString()
  tribunalPhone?: string | null;

  @IsOptional()
  @IsString()
  instructorExtension?: string | null;

  @IsInt()
  clientId!: number;

  @IsEnum(ProceduralRole)
  proceduralRole!: ProceduralRole;

  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => LegalQualificationRequestDto)
  legalQualifications?: LegalQualificationRequestDto[];

  @IsOptional()
  @IsString()
  counterparty?: string | null;

  @IsOptional()
  @IsString()
  subjectMatter?: string | null;

  @IsInt()
  responsibleLawyerId!: number;

  @IsOptional()
  @Type(() => Date)
  @IsDate()
  startDate?: Date;

  // Data of each jurisdiction (D-67). Only the type is checked here; the domain
  // checks which jurisdiction each one belongs to and the rules between them.
  @IsOptional()
  @IsBoolean()
  clientDetained?: boolean;

  @IsOptional()
  @IsBoolean()
  injunctionGranted?: boolean;

  @IsOptional()
  @Type(() => Date)
  @IsDate()
  harmfulActDate?: Date;

  @IsOptional()
  @IsBoolean()
  harmfulActRenews?: boolean;

  @IsOptional()
  @IsInt()
  harmfulActRenewalDays?: number;

  @IsOptional()
  @IsInt()
  harmfulActTermDays?: number;

  @IsOptional()
  @IsEnum(DayType)
  harmfulActTermDayType?: DayType;

  @IsOptional()
  @Type(() => Date)
  @IsDate()
  administrativeRemedyExhaustedOn?: Date;

  @IsOptional()
  @IsBoolean()
  courtFeePaid?: boolean;

  // Create the cloud folder of the case (HU39). Defaults to `true`.
  @IsOptional()
  @IsBoolean()
  createFolder?: boolean;

  // Copy the formal templates into the folder (HU40). Defaults to `createFolder`.
  @IsOptional()
  @IsBoolean()
  copyTemplates?: boolean;
}
