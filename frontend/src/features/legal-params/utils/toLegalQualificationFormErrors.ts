import type { LegalQualificationErrors } from '@/features/legal-params/schemas/legalQualification.schema';
import type { LegalQualificationFormValues } from '@/features/legal-params/types/legalQualification';

/**
 * De los `details` de un 400 a los errores del formulario de calificación.
 *
 * El contrato recibe el plazo en meses (`prescriptionMonths`) y el formulario
 * lo pide en años y meses: el error va en los años, igual que en
 * `validateLegalQualification`, porque "0 años y 0 meses" se corrige ahí. Las
 * claves que no son campos se descartan.
 */
const FIELD_BY_SERVER_NAME: Record<string, keyof LegalQualificationFormValues> = {
    name: 'name',
    prescriptionMonths: 'years',
};

export function toLegalQualificationFormErrors(
    details: Record<string, string> | null,
): LegalQualificationErrors {
    if (!details) return {};

    const errors: LegalQualificationErrors = {};
    for (const [serverName, message] of Object.entries(details)) {
        const field = FIELD_BY_SERVER_NAME[serverName];
        if (field) errors[field] = message;
    }
    return errors;
}
