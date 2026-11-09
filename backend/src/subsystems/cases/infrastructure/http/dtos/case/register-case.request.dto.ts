import { Type } from 'class-transformer';
import {
  IsArray,
  IsBoolean,
  IsDate,
  IsEnum,
  IsInt,
  IsOptional,
  IsString,
  Validate,
  ValidationArguments,
  ValidatorConstraint,
  ValidatorConstraintInterface,
} from 'class-validator';
import { DayType } from '../../../../core/domain/value-objects/deadline/day-type';
import { JurisdictionCode } from '../../../../core/domain/value-objects/case/jurisdiction-code';
import { ProceduralRole } from '../../../../core/domain/value-objects/case/procedural-role';

/**
 * One item of `legalQualifications`. Not validated on its own: its checks are
 * {@link QualificationsAreWellFormed}, so that every error lands on
 * `legalQualifications` as the contract asks. `@Type` stays, because it is what
 * turns `offenseDate` into a `Date`.
 */
export class LegalQualificationRequestDto {
  legalQualificationId!: number;

  @Type(() => Date)
  offenseDate?: Date;
}

const QUALIFICATION_FIELDS = new Set(['legalQualificationId', 'offenseDate']);

/** Why an item of `legalQualifications` is malformed, or `null` if it is not. */
function qualificationProblem(item: unknown): string | null {
  if (typeof item !== 'object' || item === null || Array.isArray(item)) {
    return 'Cada calificación legal debe ser un objeto.';
  }
  const record = item as Record<string, unknown>;
  if (Object.keys(record).some((key) => !QUALIFICATION_FIELDS.has(key))) {
    return 'Cada calificación legal solo admite legalQualificationId y offenseDate.';
  }
  if (!Number.isInteger(record.legalQualificationId)) {
    return 'Cada calificación legal requiere un identificador entero.';
  }
  // A missing date is the domain's to report, with the contract's own text.
  const date = record.offenseDate;
  if (date !== undefined && date !== null && !(date instanceof Date && !Number.isNaN(date.getTime()))) {
    return 'La fecha del hecho debe ser una fecha válida (AAAA-MM-DD).';
  }
  return null;
}

/**
 * The shape of each item of `legalQualifications`, reported **on
 * `legalQualifications`** (API contract V4 §3.7: "Los errores de una
 * calificación se informan sobre `legalQualifications`").
 *
 * A constraint instead of `@ValidateNested`, which reports on
 * `legalQualifications.0.legalQualificationId`: that is the path `flatten`
 * builds (`app.setup.ts`), right for a subform like `lawyer` in `/users` but not
 * what this contract says. The first malformed item decides the message, the
 * same as the domain's checks (`CaseFactory.checkQualifications`). Without
 * `@ValidateNested` the pipe's whitelist no longer looks inside the items, so
 * an unknown field is checked here.
 */
@ValidatorConstraint({ name: 'qualificationsAreWellFormed', async: false })
export class QualificationsAreWellFormed implements ValidatorConstraintInterface {
  validate(value: unknown): boolean {
    // Not a list is `@IsArray`'s to report.
    return !Array.isArray(value) || value.every((item) => qualificationProblem(item) === null);
  }

  defaultMessage(args: ValidationArguments): string {
    const items = args.value as unknown[];
    return items.map(qualificationProblem).find((problem) => problem !== null) as string;
  }
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
  @Validate(QualificationsAreWellFormed)
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
