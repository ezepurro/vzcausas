import { LegalQualificationRef } from '../../ports/case/legal-parameters-lookup.port';
import { FieldErrors, QualificationInput } from '../../rules/case-data-rules';
import { DayType } from '../../value-objects/deadline/day-type';
import { ProceduralRole } from '../../value-objects/case/procedural-role';

/**
 * What the "Modificar causa" form sends (HU19, contract V5 `PATCH /cases/{caseId}`).
 *
 * A field left out (`undefined`) is not touched. A nullable field sent `null` is
 * emptied (CA-19.1); a field that cannot be empty, sent `null`, is rejected.
 * The fields of one jurisdiction are rejected in the others (CA-19.4).
 */
export interface CaseChanges {
  sacNumber?: string | null;
  caption?: string | null;
  court?: string | null;
  instructorName?: string | null;
  tribunalPhone?: string | null;
  instructorExtension?: string | null;
  proceduralRole?: ProceduralRole | null;
  responsibleLawyerId?: number | null;
  startDate?: Date | null;
  courtFeePaid?: boolean | null;
  // CRIMINAL.
  legalQualifications?: QualificationInput[] | null;
  clientDetained?: boolean | null;
  // ADMINISTRATIVE and AMPARO.
  counterparty?: string | null;
  subjectMatter?: string | null;
  // AMPARO.
  injunctionGranted?: boolean | null;
  harmfulActDate?: Date | null;
  harmfulActRenews?: boolean | null;
  harmfulActRenewalDays?: number | null;
  harmfulActTermDays?: number | null;
  harmfulActTermDayType?: DayType | null;
  // ADMINISTRATIVE.
  administrativeRemedyExhaustedOn?: Date | null;
}

/** The name of a field of {@link CaseChanges}, as the contract names it. */
export type CaseField = keyof CaseChanges;

/** Every field the form can send, in the contract's order. */
export const CASE_FIELDS: readonly CaseField[] = [
  'sacNumber',
  'caption',
  'court',
  'instructorName',
  'tribunalPhone',
  'instructorExtension',
  'proceduralRole',
  'legalQualifications',
  'clientDetained',
  'counterparty',
  'subjectMatter',
  'injunctionGranted',
  'harmfulActDate',
  'harmfulActRenews',
  'harmfulActRenewalDays',
  'harmfulActTermDays',
  'harmfulActTermDayType',
  'administrativeRemedyExhaustedOn',
  'courtFeePaid',
  'responsibleLawyerId',
  'startDate',
];

/** What the case cannot find out on its own; the use case looks it up. */
export interface CaseModificationContext {
  // Civil date of the study today, and the instant of the modification.
  today: Date;
  now: Date;
  // What the use case found wrong resolving the references sent (client,
  // lawyer, qualifications), reported in the same answer as the rest.
  referenceErrors: FieldErrors;
  // The active legal qualifications among the ones sent.
  legalQualificationRefs: LegalQualificationRef[];
}

/**
 * Validated changes waiting to be applied: each part of the case validates
 * first and applies only when every part was valid, so a rejected request
 * leaves the case as it was. Applying returns the fields that really changed.
 */
export type PendingChanges = () => CaseField[];
