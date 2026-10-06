import { JurisdictionCode } from '../../../core/domain/value-objects/jurisdiction-code';
import { ProceduralRole } from '../../../core/domain/value-objects/procedural-role';

export class ClientResponseDto {
  id!: number;
  lastName!: string;
  firstName!: string;
  dni!: string;
  phone!: string | null;
  email!: string | null;
  clientSince!: Date;
}

export class ResponsibleLawyerResponseDto {
  id!: number;
  fullName!: string;
  registrationNumber!: string;
}

export class LegalQualificationResponseDto {
  id!: number;
  name!: string;
  prescriptionMonths!: number;
  offenseDate!: Date;
  prescriptionStartsOn!: Date;
  prescriptionExpiresOn!: Date;
}

export class CurrentStateResponseDto {
  proceduralStateId!: number | null;
  name!: string;
  custom!: boolean;
  initial!: boolean;
  proceduralActId!: number | null;
  dueDate!: Date | null;
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
  instructorPhone!: string | null;
  instructorExtension!: string | null;
  counterparty!: string | null;
  subjectMatter!: string | null;
  client!: ClientResponseDto;
  responsibleLawyer!: ResponsibleLawyerResponseDto;
  legalQualifications!: LegalQualificationResponseDto[];
  startDate!: Date;
  currentState!: CurrentStateResponseDto;
  active!: boolean;
}
