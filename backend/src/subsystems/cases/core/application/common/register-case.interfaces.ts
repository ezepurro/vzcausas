import { Case } from '../../domain/entities/cases';
import { Offense } from '../../domain/entities/offense';
import { ClientRef } from '../../domain/ports/client-lookup.port';
import { LawyerRef } from '../../domain/ports/lawyer-lookup.port';
import { ProceduralStateRef } from '../../domain/ports/proc-state-lookup.port';
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
  instructorPhone?: string | null;
  instructorExtension?: string | null;
  counterparty?: string | null;
  subjectMatter?: string | null;
  clientId: number;
  proceduralRole: ProceduralRole;
  legalQualifications?: RegisterCaseQualificationInput[];
  responsibleLawyerId: number;
  // Required with a SAC number, not allowed without one (CA-18.2).
  startDate?: Date;
}

export interface RegisterCaseResult {
  newCase: Case;
  client: ClientRef;
  responsibleLawyer: LawyerRef;
  // The offenses of the case: empty unless it is a criminal case.
  offenses: Offense[];
  // The procedural state the stored case is in, read from the database.
  currentState: ProceduralStateRef;
}
