import { IsOptional } from "class-validator";

/**
 * Body of `DELETE /lawyers/{lawyerId}` (HU15, contract V6 §3.3): the distribution that the "Eliminar
 * abogado" form builds, one entry per active case of the lawyer. The whole body is optional: a
 * lawyer without active cases is given de baja without one. Any other field is refused by the
 * global pipe with "No es un campo admitido.".
 *
 * **Nothing about the distribution is checked here**, not even that it is a list. The contract
 * answers a bad distribution with `details.reassignments`, which the pipe cannot produce (it would
 * name the field of the entry, `reassignments.0.unassigned`), and it checks the lawyer exists (404)
 * **before** the body (400). `CaseReassignmentPlan` checks all of it, after the 404, so the error is
 * the same whatever is wrong with the distribution.
 */
export class DeactivateLawyerRequestDto {
  @IsOptional()
  reassignments?: unknown;
}
