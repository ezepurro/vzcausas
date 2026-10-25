import type { CaseFormErrors } from '@/features/cases/schemas/case.schema'
import type { CaseFormValues } from '@/features/cases/types/case'

/**
 * De los `details` de un 400 de `POST /cases` a los errores del formulario.
 *
 * Sólo pasan los campos que `CaseForm` pinta debajo de su control. El resto
 * —las casillas (`courtFeePaid`, `clientDetained`, `createFolder`,
 * `copyTemplates`…) o una clave que el front no conoce— no tiene dónde
 * mostrarse y se descarta: si no queda ninguno, la página avisa con
 * `e.message` en lugar de quedar muda.
 *
 * Los nombres del contrato y los del formulario coinciden (D-22), así que no
 * hay traducción, sólo filtro.
 */
const SHOWN_FIELDS: ReadonlySet<keyof CaseFormValues> = new Set<keyof CaseFormValues>([
    'sacNumber',
    'caption',
    'court',
    'instructorName',
    'tribunalPhone',
    'instructorExtension',
    'clientId',
    'proceduralRole',
    'legalQualifications',
    'counterparty',
    'subjectMatter',
    'harmfulActDate',
    'harmfulActTermDays',
    'harmfulActRenewalDays',
    'administrativeRemedyExhaustedOn',
    'responsibleLawyerId',
    'startDate',
])

function isShownField(name: string): name is keyof CaseFormValues {
    return SHOWN_FIELDS.has(name as keyof CaseFormValues)
}

export function toFormErrors(details: Record<string, string> | null): CaseFormErrors {
    if (!details) return {}

    const errors: CaseFormErrors = {}
    for (const [serverName, message] of Object.entries(details)) {
        if (isShownField(serverName)) errors[serverName] = message
    }
    return errors
}
