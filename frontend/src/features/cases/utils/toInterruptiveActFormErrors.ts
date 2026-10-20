import type { InterruptiveActFormErrors } from '@/features/cases/schemas/interruptiveAct.schema'
import type { InterruptiveActFormValues } from '@/features/cases/types/interruptiveAct'

/**
 * De los `details` de un 400 de `POST /cases/{caseId}/interruptive-acts` a los
 * errores del modal.
 *
 * Los nombres del contrato y los del formulario coinciden (V4 §3.9). Las claves
 * que no son campos —`caseId` en un `INVALID_PATH_PARAMETER`, por ejemplo— no
 * tienen dónde pintarse y se descartan: si no queda ninguna, la página avisa
 * con `e.message` en lugar de quedar muda.
 */
const FIELD_BY_SERVER_NAME: Record<string, keyof InterruptiveActFormValues> = {
    name: 'name',
    actDate: 'actDate',
    notes: 'notes',
}

export function toInterruptiveActFormErrors(details: Record<string, string> | null): InterruptiveActFormErrors {
    if (!details) return {}

    const errors: InterruptiveActFormErrors = {}
    for (const [serverName, message] of Object.entries(details)) {
        const field = FIELD_BY_SERVER_NAME[serverName]
        if (field) errors[field] = message
    }
    return errors
}
