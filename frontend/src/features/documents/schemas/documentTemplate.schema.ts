import type { DocumentTemplateFormValues } from '@/features/documents/types/documentTemplate'

/**
 * Validación del formulario de modelo formal, antes de subir el archivo: el
 * alta (HU-34) y la modificación (HU-36). Los mensajes y los topes son los del
 * contrato (V6 §3.10). El backend vuelve a validar todo.
 */

export type DocumentTemplateErrors = Partial<Record<keyof DocumentTemplateFormValues, string>>

/** `create` pide el archivo; en `edit` es opcional (CA-36.4). */
export type DocumentTemplateFormMode = 'create' | 'edit'

export const NAME_MAX = 150
/** 10 MB justos se aceptan; un byte más, no (CA-34.10). */
export const MAX_FILE_BYTES = 10 * 1024 * 1024

export function validateDocumentTemplate(
    values: DocumentTemplateFormValues,
    mode: DocumentTemplateFormMode = 'create',
): DocumentTemplateErrors {
    const errors: DocumentTemplateErrors = {}

    const name = values.name.trim()
    if (name === '') errors.name = 'El nombre del modelo es obligatorio.'
    else if (name.length > NAME_MAX) errors.name = `Puede tener hasta ${NAME_MAX} caracteres.`

    if (values.jurisdictions.length === 0) errors.jurisdictions = 'Elegí al menos un fuero.'

    /* En la modificación, sin archivo nuevo el modelo conserva el suyo. Si se
       eligió uno, se valida igual que en el alta (CA-36.5). Por la extensión y
       no por el tipo: el navegador no siempre lo informa. */
    if (values.file === null) {
        if (mode === 'create') errors.file = 'El archivo del modelo es obligatorio.'
    } else if (!values.file.name.toLowerCase().endsWith('.docx')) errors.file = 'El archivo tiene que ser .docx.'
    else if (values.file.size > MAX_FILE_BYTES) errors.file = 'El archivo supera el tamaño máximo de 10 MB.'

    return errors
}

export function isValid(errors: DocumentTemplateErrors): boolean {
    return Object.keys(errors).length === 0
}