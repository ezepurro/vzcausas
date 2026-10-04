import type { ProceduralActErrors } from '@/features/proceedings/schemas/proceduralAct.schema'
import type { ProceduralActFormValues } from '@/features/proceedings/types/proceduralAct'

/**
 * De los `details` de un 400 a los errores del formulario.
 *
 * El servidor nombra los campos del CONTRATO y el formulario tiene los suyos:
 * el estado viaja como `proceduralStateId` o `customState`, y en pantalla es
 * un solo combobox (`stateText`). Las claves que no son campos —`caseId` en un
 * `INVALID_PATH_PARAMETER`, por ejemplo— no tienen dónde pintarse y se
 * descartan.
 */
const FIELD_BY_SERVER_NAME: Record<string, keyof ProceduralActFormValues> = {
    proceduralStateId: 'stateText',
    customState: 'stateText',
    actDate: 'actDate',
    notificationDate: 'notificationDate',
    manualDueDate: 'manualDueDate',
    notes: 'notes',
}

export function toFormErrors(details: Record<string, string> | null): ProceduralActErrors {
    if (!details) return {}

    const errors: ProceduralActErrors = {}
    for (const [serverName, message] of Object.entries(details)) {
        const field = FIELD_BY_SERVER_NAME[serverName]
        if (field) errors[field] = message
    }
    return errors
}
