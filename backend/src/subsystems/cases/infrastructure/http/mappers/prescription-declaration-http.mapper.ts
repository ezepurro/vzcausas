import { toIsoDate, toIsoWithOffset } from '@shared/infrastructure/http/iso-date';
import { PrescriptionDeclarationView } from '../../../core/domain/ports/case/case-timeline-query.port';
import { PrescriptionDeclarationResponseDto } from '../dtos/case/timeline.response.dto';

/**
 * `prescriptionDeclaration` in the contract's shape (V4 §3.7).
 *
 * Shared by `CaseHttpMapper` (the case resource) and `TimelineHttpMapper` (the
 * `PRESCRIPTION_DECLARATION` entry): the contract shows the same object in
 * both, so it goes out one way only.
 */
export function toPrescriptionDeclarationResponse(
  declaration: PrescriptionDeclarationView,
  timeZone: string,
): PrescriptionDeclarationResponseDto {
  return {
    prescriptionDate: toIsoDate(declaration.prescriptionDate),
    resolution: declaration.resolution,
    grounds: declaration.grounds,
    registeredBy: declaration.registeredBy,
    registeredAt: toIsoWithOffset(declaration.registeredAt, timeZone),
  };
}
