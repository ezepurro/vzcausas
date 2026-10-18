import type {
    LegalQualification,
    LegalQualificationFormValues,
    UpdateLegalQualificationBody,
} from '@/features/legal-params/types/legalQualification';
import { toPrescriptionMonths } from '@/features/legal-params/utils/prescription';

/**
 * Del formulario al cuerpo de `PATCH /legal-qualifications/{id}`: sólo lo que
 * cambió.
 *
 * Recorta el nombre ANTES de comparar, así un espacio al final no cuenta como
 * cambio. El plazo se compara en meses, que es como lo guarda el contrato: "6
 * años y 0 meses" y "72 meses" son el mismo plazo. Si no cambió nada devuelve
 * `{}` y la pantalla no manda nada: el contrato responde 400 a un PATCH vacío.
 *
 * Se llama después de `validateLegalQualification`, que ya garantizó que los
 * años y los meses son enteros.
 */
export function buildLegalQualificationPatch(
    original: LegalQualification,
    values: LegalQualificationFormValues,
): UpdateLegalQualificationBody {
    const patch: UpdateLegalQualificationBody = {};

    const name = values.name.trim();
    if (name !== original.name) patch.name = name;

    const months = toPrescriptionMonths(values.years, values.months);
    if (months !== null && months !== original.prescriptionMonths) patch.prescriptionMonths = months;

    return patch;
}

/** `true` si no quedó nada para mandar. */
export function isEmptyLegalQualificationPatch(patch: UpdateLegalQualificationBody): boolean {
    return Object.keys(patch).length === 0;
}
