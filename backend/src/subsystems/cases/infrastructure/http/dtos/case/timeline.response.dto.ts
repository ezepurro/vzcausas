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
  | { type: 'PRESCRIPTION_DECLARATION'; date: string; prescriptionDeclaration: PrescriptionDeclarationResponseDto };
