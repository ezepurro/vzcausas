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
  ValidateIf,
  ValidatorConstraint,
  ValidatorConstraintInterface,
} from 'class-validator';
import { DayType } from '../../../../core/domain/value-objects/deadline/day-type';
import { ProceduralRole } from '../../../../core/domain/value-objects/case/procedural-role';
import { LegalQualificationRequestDto, QualificationsAreWellFormed } from './register-case.request.dto';

/**
 * `jurisdiction` is declared only to be refused with the contract's own text
 * (D-95, CA-19.3): a case registered in the wrong jurisdiction is given de
 * baja and registered again. Any other field the DTO does not declare —
 * folder, procedural state, prescription, `active` — is refused by the global
 * pipe with "No es un campo admitido.".
 */
@ValidatorConstraint({ name: 'jurisdictionIsNotModifiable', async: false })
export class JurisdictionIsNotModifiable implements ValidatorConstraintInterface {
  validate(): boolean {
    return false;
  }

  defaultMessage(): string {
    return 'El fuero de una causa no se puede modificar.';
  }
}

/**
 * Request body of `PATCH /cases/{caseId}` (HU19, contract V5 §3.7).
 *
 * Every field is optional, with the same type checks and messages as the
 * registration (`RegisterCaseRequestDto`). `null` is let through on purpose:
 * on a nullable field it empties it, on the others the domain refuses it
 * (CA-19.1). Lengths, the SAC and every rule between fields are the domain's
 * (`Case.modify`), which reports them all at once.
 */
export class UpdateCaseRequestDto {
  @ValidateIf((_, value) => value !== undefined)
  @Validate(JurisdictionIsNotModifiable)
  jurisdiction?: unknown;

  @IsOptional()
  @IsString({ message: 'Debe ser un texto.' })
  sacNumber?: string | null;

  @IsOptional()
  @IsString({ message: 'Debe ser un texto.' })
  caption?: string | null;

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

  @IsOptional()
  @IsInt({ message: 'Debe ser un número entero.' })
  clientId?: number | null;

  @IsOptional()
  @IsEnum(ProceduralRole, { message: 'No es un rol procesal válido.' })
  proceduralRole?: ProceduralRole | null;

  @IsOptional()
  @IsArray({ message: 'Debe ser una lista.' })
  @Validate(QualificationsAreWellFormed)
  @Type(() => LegalQualificationRequestDto)
  legalQualifications?: LegalQualificationRequestDto[] | null;

  @IsOptional()
  @IsBoolean({ message: 'Debe ser true o false.' })
  clientDetained?: boolean | null;

  @IsOptional()
  @IsString({ message: 'Debe ser un texto.' })
  counterparty?: string | null;

  @IsOptional()
  @IsString({ message: 'Debe ser un texto.' })
  subjectMatter?: string | null;

  @IsOptional()
  @IsBoolean({ message: 'Debe ser true o false.' })
  injunctionGranted?: boolean | null;

  @IsOptional()
  @Type(() => Date)
  @IsDate({ message: 'Debe ser una fecha válida (AAAA-MM-DD).' })
  harmfulActDate?: Date | null;

  @IsOptional()
  @IsBoolean({ message: 'Debe ser true o false.' })
  harmfulActRenews?: boolean | null;

  @IsOptional()
  @IsInt({ message: 'Debe ser un número entero.' })
  harmfulActRenewalDays?: number | null;

  @IsOptional()
  @IsInt({ message: 'Debe ser un número entero.' })
  harmfulActTermDays?: number | null;

  @IsOptional()
  @IsEnum(DayType, { message: 'Debe ser BUSINESS o CONSECUTIVE.' })
  harmfulActTermDayType?: DayType | null;

  @IsOptional()
  @Type(() => Date)
  @IsDate({ message: 'Debe ser una fecha válida (AAAA-MM-DD).' })
  administrativeRemedyExhaustedOn?: Date | null;

  @IsOptional()
  @IsBoolean({ message: 'Debe ser true o false.' })
  courtFeePaid?: boolean | null;

  @IsOptional()
  @IsInt({ message: 'Debe ser un número entero.' })
  responsibleLawyerId?: number | null;

  @IsOptional()
  @Type(() => Date)
  @IsDate({ message: 'Debe ser una fecha válida (AAAA-MM-DD).' })
  startDate?: Date | null;
}
