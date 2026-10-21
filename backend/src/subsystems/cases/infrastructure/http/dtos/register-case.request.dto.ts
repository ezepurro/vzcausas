import { Type } from 'class-transformer';
import { IsArray, IsBoolean, IsDate, IsEnum, IsInt, IsOptional, IsString, ValidateNested } from 'class-validator';
import { DayType } from '../../../core/domain/value-objects/day-type';
import { JurisdictionCode } from '../../../core/domain/value-objects/jurisdiction-code';
import { ProceduralRole } from '../../../core/domain/value-objects/procedural-role';

export class LegalQualificationRequestDto {
  @IsInt({ message: 'Debe ser un número entero.' })
  legalQualificationId!: number;

  @IsOptional()
  @Type(() => Date)
  @IsDate({ message: 'Debe ser una fecha válida (AAAA-MM-DD).' })
  offenseDate?: Date;
}

/**
 * Request body of `POST /cases` (API contract §3.7).
 *
 * Only the shape and the types are checked here. Lengths and business rules
 * are checked by the domain, which reports them by field as the contract shows.
 */
export class RegisterCaseRequestDto {
  @IsEnum(JurisdictionCode, { message: 'No existe un fuero procesal con ese nombre.' })
  jurisdiction!: JurisdictionCode;

  @IsOptional()
  @IsString({ message: 'Debe ser un texto.' })
  sacNumber?: string | null;

  @IsString({ message: 'Debe ser un texto.' })
  caption!: string;

  @IsOptional()
  @IsString({ message: 'Debe ser un texto.' })
  court?: string | null;

  @IsOptional()
  @IsString({ message: 'Debe ser un texto.' })
  instructorName?: string | null;

  @IsOptional()
  @IsString({ message: 'Debe ser un texto.' })
  tribunalPhone?: string | null;

  @IsOptional()
  @IsString({ message: 'Debe ser un texto.' })
  instructorExtension?: string | null;

  @IsInt({ message: 'Debe ser un número entero.' })
  clientId!: number;

  @IsEnum(ProceduralRole, { message: 'No es un rol procesal válido.' })
  proceduralRole!: ProceduralRole;

  @IsOptional()
  @IsArray({ message: 'Debe ser una lista.' })
  @ValidateNested({ each: true, message: 'Cada calificación legal debe ser un objeto.' })
  @Type(() => LegalQualificationRequestDto)
  legalQualifications?: LegalQualificationRequestDto[];

  @IsOptional()
  @IsString({ message: 'Debe ser un texto.' })
  counterparty?: string | null;

  @IsOptional()
  @IsString({ message: 'Debe ser un texto.' })
  subjectMatter?: string | null;

  @IsInt({ message: 'Debe ser un número entero.' })
  responsibleLawyerId!: number;

  @IsOptional()
  @Type(() => Date)
  @IsDate({ message: 'Debe ser una fecha válida (AAAA-MM-DD).' })
  startDate?: Date;

  // Data of each jurisdiction (D-67). Only the type is checked here; the domain
  // checks which jurisdiction each one belongs to and the rules between them.
  @IsOptional()
  @IsBoolean({ message: 'Debe ser true o false.' })
  clientDetained?: boolean;

  @IsOptional()
  @IsBoolean({ message: 'Debe ser true o false.' })
  injunctionGranted?: boolean;

  @IsOptional()
  @Type(() => Date)
  @IsDate({ message: 'Debe ser una fecha válida (AAAA-MM-DD).' })
  harmfulActDate?: Date;

  @IsOptional()
  @IsBoolean({ message: 'Debe ser true o false.' })
  harmfulActRenews?: boolean;

  @IsOptional()
  @IsInt({ message: 'Debe ser un número entero.' })
  harmfulActRenewalDays?: number;

  @IsOptional()
  @IsInt({ message: 'Debe ser un número entero.' })
  harmfulActTermDays?: number;

  @IsOptional()
  @IsEnum(DayType, { message: 'Debe ser BUSINESS o CONSECUTIVE.' })
  harmfulActTermDayType?: DayType;

  @IsOptional()
  @Type(() => Date)
  @IsDate({ message: 'Debe ser una fecha válida (AAAA-MM-DD).' })
  administrativeRemedyExhaustedOn?: Date;

  @IsOptional()
  @IsBoolean({ message: 'Debe ser true o false.' })
  courtFeePaid?: boolean;

  // Create the cloud folder of the case (HU39). Defaults to `true`.
  @IsOptional()
  @IsBoolean({ message: 'Debe ser true o false.' })
  createFolder?: boolean;

  // Copy the formal templates into the folder (HU40). Defaults to `createFolder`.
  @IsOptional()
  @IsBoolean({ message: 'Debe ser true o false.' })
  copyTemplates?: boolean;
}
