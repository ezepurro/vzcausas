import { IsArray, IsOptional } from "class-validator";

/**
 * Body of `DELETE /lawyers/{lawyerId}` (HU15, contract V6 §3.3): the distribution that the "Eliminar
 * abogado" form builds, one entry per active case of the lawyer. The whole body is optional: a
 * lawyer without active cases is given de baja without one. Any other field is refused by the
 * global pipe with "No es un campo admitido.".
 *
 * **Only that it is a list is checked here.** What each entry says (a lawyer to take the case, or
 * `unassigned: true`; no case repeated; no entry with both or neither) is the contract's
 * `details.reassignments`, which the pipe cannot produce: it would name the field of the entry
 * (`reassignments.0.unassigned`) and not the whole distribution. `CaseReassignmentPlan` checks the
 * entries, so the error is the same whatever is wrong with the distribution.
 */
export class DeactivateLawyerRequestDto {
  @IsOptional()
  @IsArray({ message: "Debe ser una lista de causas." })
  reassignments?: unknown[];
}
