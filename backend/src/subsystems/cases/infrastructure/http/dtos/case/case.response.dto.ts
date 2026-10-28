import { JurisdictionCode } from '../../../../core/domain/value-objects/case/jurisdiction-code';
import { ProceduralRole } from '../../../../core/domain/value-objects/case/procedural-role';
import { PrescriptionDeclarationResponseDto } from './timeline.response.dto';

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
  prescriptionExpiresOn!: string;
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

/** The cloud folder of a case (API contract §3.7, `folder`). */
export class CaseFolderResponseDto {
  status!: 'PENDING' | 'CREATING' | 'CREATED' | 'ERROR';
  // `null` until the folder is `CREATED`.
  url!: string | null;
  path!: string | null;
  templatesCopied!: number;
  templatesPending!: number;
}

/** `harmfulActDeadline` (API contract §3.7, D-78): the term to file an amparo. */
export class HarmfulActDeadlineResponseDto {
  actDate!: string;
  renewed!: boolean;
  dueDate!: string;
  businessDaysRemaining!: number;
}

/**
 * `prescription` (API contract V4 §3.7): the one of the qualification that
 * prescribes first, computed on every read.
 */
export class PrescriptionResponseDto {
  legalQualificationId!: number;
  legalQualificationName!: string;
  startsOn!: string;
  expiresOn!: string;
  elapsedPercentage!: number;
  alert!: boolean;
  expired!: boolean;
  // `null` when the computation counts from the offense date.
  lastInterruptiveActDate!: string | null;
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
  // Data of each jurisdiction (D-67): `null` outside its own.
  clientDetained!: boolean | null;
  injunctionGranted!: boolean | null;
  harmfulActDate!: string | null;
  harmfulActRenews!: boolean | null;
  harmfulActRenewalDays!: number | null;
  harmfulActTermDays!: number | null;
  harmfulActTermDayType!: 'BUSINESS' | 'CONSECUTIVE' | null;
  harmfulActDeadline!: HarmfulActDeadlineResponseDto | null;
  administrativeRemedyExhaustedOn!: string | null;
  courtFeePaid!: boolean;
  client!: ClientResponseDto;
  responsibleLawyer!: ResponsibleLawyerResponseDto;
  legalQualifications!: LegalQualificationResponseDto[];
  // `null` outside `CRIMINAL` and in a criminal case without qualifications.
  prescription!: PrescriptionResponseDto | null;
  // `null` while the case was not marked as prescribed (HU33).
  prescriptionDeclaration!: PrescriptionDeclarationResponseDto | null;
  // `null` while the case has no SAC number.
  startDate!: string | null;
  currentState!: CurrentStateResponseDto;
  // `null` in a case registered before the folders existed.
  folder!: CaseFolderResponseDto | null;
  active!: boolean;
}
