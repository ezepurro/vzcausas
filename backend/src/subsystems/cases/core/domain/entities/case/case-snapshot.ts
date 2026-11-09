import { DayType } from '../../value-objects/deadline/day-type';
import { Instructor } from '../../value-objects/case/instructor';
import { JurisdictionCode } from '../../value-objects/case/jurisdiction-code';
import { ProceduralRole } from '../../value-objects/case/procedural-role';
import { PrescriptionDeclaration } from '../../value-objects/prescription/prescription-declaration.vo';

/** An offense of a case as plain data. */
export interface OffenseSnapshot {
  legalQualificationId: number;
  legalQualificationName: string;
  prescriptionMonths: number;
  offenseDate: Date;
  prescriptionStartsOn: Date;
  /** Never `null`: a criminal case calculates it when it is built (`CriminalCase`). */
  prescriptionExpiresOn: Date;
  /** The declaration that this offense prescribed (D-113); `null` while it was not declared. */
  prescriptionDeclaration: PrescriptionDeclaration | null;
}

/**
 * A case as plain data, the same for the three jurisdictions: what belongs to
 * another jurisdiction is `null` (D-67) and the offenses are empty outside
 * `CRIMINAL`. Each kind of case fills its own part ({@link Case.toSnapshot}), so
 * whoever stores or shows a case does not need to ask what kind it is.
 */
export interface CaseSnapshot {
  id: number;
  sacNumber: string | null;
  caption: string;
  court: string | null;
  jurisdictionId: number;
  jurisdictionCode: JurisdictionCode;
  proceduralRole: ProceduralRole;
  instructor: Instructor;
  clientId: number;
  responsibleLawyerId: number;
  startDate: Date | null;
  courtFeePaid: boolean;
  currentStateId: number | null;
  currentCustomState: string | null;
  currentProceduralActId: number | null;
  // ADMINISTRATIVE and AMPARO.
  counterparty: string | null;
  subjectMatter: string | null;
  // CRIMINAL.
  clientDetained: boolean | null;
  offenses: OffenseSnapshot[];
  // AMPARO.
  injunctionGranted: boolean | null;
  harmfulActDate: Date | null;
  harmfulActRenews: boolean | null;
  harmfulActRenewalDays: number | null;
  harmfulActTermDays: number | null;
  harmfulActTermDayType: DayType | null;
  // ADMINISTRATIVE.
  administrativeRemedyExhaustedOn: Date | null;
  active: boolean;
  createdByUserId: number;
  createdAt: Date;
  updatedAt: Date;
}
