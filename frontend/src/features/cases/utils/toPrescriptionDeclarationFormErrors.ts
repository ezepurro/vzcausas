import type { PrescriptionDeclarationFormErrors } from '@/features/cases/schemas/prescriptionDeclaration.schema'
import type { PrescriptionDeclarationFormValues } from '@/features/cases/types/prescriptionDeclaration'

/**
 * De los `details` de un 400 de `POST /cases/{caseId}/prescription` a los
 * errores del modal "Marcar prescripta".
 *
 * Los nombres del contrato y los del formulario coinciden (V4 §3.7). Las claves
 * que no son campos —`caseId` en un `INVALID_PATH_PARAMETER`, por ejemplo— no
 * tienen dónde pintarse y se descartan: si no queda ninguna, la página avisa
 * con `e.message` en lugar de quedar muda.
 */
const FIELD_BY_SERVER_NAME: Record<string, keyof PrescriptionDeclarationFormValues> = {
    prescriptionDate: 'prescriptionDate',
    resolution: 'resolution',
    grounds: 'grounds',
}

export function toPrescriptionDeclarationFormErrors(
    details: Record<string, string> | null,
): PrescriptionDeclarationFormErrors {
    if (!details) return {}

    const errors: PrescriptionDeclarationFormErrors = {}
    for (const [serverName, message] of Object.entries(details)) {
        const field = FIELD_BY_SERVER_NAME[serverName]
        if (field) errors[field] = message
    }
    return errors
}
