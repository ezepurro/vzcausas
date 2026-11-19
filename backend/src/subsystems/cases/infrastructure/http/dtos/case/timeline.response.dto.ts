import { InterruptiveActResponseDto } from '../interruptive-act/interruptive-act.response.dto';
import { ProceduralActResponseDto } from '../procedural-act/procedural-act.response.dto';

/** The `prescriptionDeclaration` of a case (contract V4 §3.7). Dates as `YYYY-MM-DD`, except `registeredAt`. */
export class PrescriptionDeclarationResponseDto {
  prescriptionDate!: string;
  resolution!: string;
  grounds!: string | null;
  registeredBy!: { id: number; lastName: string; firstName: string };
  registeredAt!: string;
}

/** The `responsibleLawyerChange` of an entry (D-147): the lawyers and the user as `{ id, lastName, firstName }`. */
export class ResponsibleLawyerChangeResponseDto {
  id!: number;
  caseId!: number;
  kind!: 'REASSIGNED' | 'ORPHANED' | 'ASSIGNED_FROM_ORPHAN';
  previousLawyer!: { id: number; lastName: string; firstName: string } | null;
  newLawyer!: { id: number; lastName: string; firstName: string } | null;
  origin!: 'MANUAL' | 'LAWYER_REMOVAL';
  changedBy!: { id: number; lastName: string; firstName: string };
  changedAt!: string;
}

/**
 * One entry of `GET /cases/{caseId}/timeline` (HU27, D-85). Each carries the
 * resource exactly as its own section of the contract defines it.
 */
export type TimelineEntryResponseDto =
  | { type: 'PROCEDURAL_ACT'; date: string; current: boolean; proceduralAct: ProceduralActResponseDto }
  | {
      type: 'INTERRUPTIVE_ACT';
      date: string;
      governsPrescription: boolean;
      interruptiveAct: InterruptiveActResponseDto;
    }
  | {
      // D-113: one legal qualification declared prescribed.
      type: 'QUALIFICATION_PRESCRIPTION_DECLARATION';
      date: string;
      legalQualification: { id: number; name: string };
      prescriptionDeclaration: PrescriptionDeclarationResponseDto;
    }
  | { type: 'PRESCRIPTION_DECLARATION'; date: string; prescriptionDeclaration: PrescriptionDeclarationResponseDto }
  // D-147: a change of the responsible lawyer.
  | { type: 'RESPONSIBLE_LAWYER_CHANGE'; date: string; responsibleLawyerChange: ResponsibleLawyerChangeResponseDto };
