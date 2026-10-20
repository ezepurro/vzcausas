import { Case } from '../../domain/entities/cases';
import { Offense } from '../../domain/entities/offense';
import { CaseFolderView } from '../../domain/ports/case-folder-state.port';
import { ClientRef, LawyerRef } from '../../domain/ports/people-lookup.port';
import { ProceduralStateRef } from '../../domain/ports/legal-parameters-lookup.port';
import { DayType } from '../../domain/value-objects/day-type';
import { HarmfulActDeadline } from '../../domain/value-objects/harmful-act';
import { JurisdictionCode } from '../../domain/value-objects/jurisdiction-code';
import { ProceduralRole } from '../../domain/value-objects/procedural-role';

export interface RegisterCaseQualificationInput {
  legalQualificationId: number;
  // Undefined when the client did not send it.
  offenseDate?: Date;
}

export interface RegisterCaseCommand {
  createdByUserId: number;
  jurisdiction: JurisdictionCode;
  sacNumber?: string | null;
  caption: string;
  court?: string | null;
  instructorName?: string | null;
  tribunalPhone?: string | null;
  instructorExtension?: string | null;
  counterparty?: string | null;
  subjectMatter?: string | null;
  clientId: number;
  proceduralRole: ProceduralRole;
  legalQualifications?: RegisterCaseQualificationInput[];
  responsibleLawyerId: number;
  // Required with a SAC number, not allowed without one (CA-18.2).
  startDate?: Date;
  // Data of each jurisdiction (D-67): only in its own, validated by the domain.
  clientDetained?: boolean;
  injunctionGranted?: boolean;
  harmfulActDate?: Date;
  harmfulActRenews?: boolean;
  harmfulActRenewalDays?: number;
  harmfulActTermDays?: number;
  harmfulActTermDayType?: DayType;
  administrativeRemedyExhaustedOn?: Date;
  courtFeePaid?: boolean;
  // Create the cloud folder of the case (HU39). Defaults to `true`.
  createFolder?: boolean;
  // Copy the formal templates into that folder (HU40, not implemented yet).
  // Defaults to `createFolder`; `true` without a folder is a validation error.
  copyTemplates?: boolean;
}

export interface RegisterCaseResult {
  newCase: Case;
  client: ClientRef;
  responsibleLawyer: LawyerRef;
  // The offenses of the case: empty unless it is a criminal case.
  offenses: Offense[];
  // The procedural state the stored case is in, read from the database.
  currentState: ProceduralStateRef;
  // The term to file the amparo as of today (D-78). `null` outside an amparo or without the date of the harmful act.
  harmfulActDeadline: HarmfulActDeadline | null;
  // The cloud folder as it stood when the registration answered (HU39): `CREATED`
  // if it was ready in time, `CREATING` if still being made, `ERROR` if it failed,
  // `PENDING` if none was asked for.
  folder: CaseFolderView | null;
}
