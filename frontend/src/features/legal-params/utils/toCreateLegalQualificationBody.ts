import type {
    CreateLegalQualificationBody,
    LegalQualificationFormValues,
} from '@/features/legal-params/types/legalQualification';
import { toPrescriptionMonths } from '@/features/legal-params/utils/prescription';

/**
 * Del formulario al cuerpo de `POST /legal-qualifications`: el nombre
 * recortado y el plazo en meses, que es como lo guarda el contrato.
 *
 * Se llama después de `validateLegalQualification`, que ya garantizó que los
 * años y los meses son enteros: los meses nunca quedan en `null`.
 */
export function toCreateLegalQualificationBody(
    values: LegalQualificationFormValues,
): CreateLegalQualificationBody {
    return {
        name: values.name.trim(),
        prescriptionMonths: toPrescriptionMonths(values.years, values.months) ?? 0,
    };
}
