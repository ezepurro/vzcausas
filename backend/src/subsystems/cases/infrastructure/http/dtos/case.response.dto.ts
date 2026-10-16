import { JurisdictionCode } from '../../../core/domain/value-objects/jurisdiction-code';
import { ProceduralRole } from '../../../core/domain/value-objects/procedural-role';

/** Dates go out as `YYYY-MM-DD` strings, as the contract defines them. */
export class ClientResponseDto {
  id!: number;
  lastName!: string;
  firstName!: string;
  dni!: string;
  phone!: string | null;
  email!: string | null;
  clientSince!: string;
}

export class ResponsibleLawyerResponseDto {
  id!: number;
  lastName!: string;
  firstName!: string;
  registrationNumber!: string;
}

export class LegalQualificationResponseDto {
  id!: number;
  name!: string;
  prescriptionMonths!: number;
  offenseDate!: string;
  prescriptionStartsOn!: string;
  prescriptionExpiresOn!: string | null;
}

export class CurrentStateResponseDto {
  proceduralStateId!: number | null;
  name!: string;
  custom!: boolean;
  initial!: boolean;
  proceduralActId!: number | null;
  dueDate!: string | null;
  businessDaysRemaining!: number | null;
  manuallyAdjusted!: boolean;
}

/** The case resource of the API contract (§3.7). */
export class CaseResponseDto {
  id!: number;
  sacNumber!: string | null;
  caption!: string;
  court!: string | null;
  jurisdiction!: JurisdictionCode;
  proceduralRole!: ProceduralRole;
  instructorName!: string | null;
  tribunalPhone!: string | null;
  instructorExtension!: string | null;
  counterparty!: string | null;
  subjectMatter!: string | null;
  client!: ClientResponseDto;
  responsibleLawyer!: ResponsibleLawyerResponseDto;
  legalQualifications!: LegalQualificationResponseDto[];
  // `null` while the case has no SAC number.
  startDate!: string | null;
  currentState!: CurrentStateResponseDto;
  active!: boolean;
}
