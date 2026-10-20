import type { DocumentTemplateErrors } from '@/features/documents/schemas/documentTemplate.schema'
import type { DocumentTemplateFormValues } from '@/features/documents/types/documentTemplate'

/**
 * De los `details` de un 400 de `POST /document-templates` a los errores del
 * formulario.
 *
 * Los nombres del contrato y los del formulario coinciden (V4 §3.10).
 * `copyToNewCases` es una casilla sin lugar para un mensaje: como cualquier
 * clave que el formulario no pinta, se descarta, y si no queda ninguna la
 * página avisa con `e.message` en lugar de quedar muda.
 */
const FIELD_BY_SERVER_NAME: Record<string, keyof DocumentTemplateFormValues> = {
    name: 'name',
    jurisdictions: 'jurisdictions',
    file: 'file',
}

export function toFormErrors(details: Record<string, string> | null): DocumentTemplateErrors {
    if (!details) return {}

    const errors: DocumentTemplateErrors = {}
    for (const [serverName, message] of Object.entries(details)) {
        const field = FIELD_BY_SERVER_NAME[serverName]
        if (field) errors[field] = message
    }
    return errors
}
