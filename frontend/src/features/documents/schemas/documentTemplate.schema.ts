import type { DocumentTemplateFormValues } from '@/features/documents/types/documentTemplate'

/**
 * Validación del alta de modelo formal (HU-34), antes de subir el archivo.
 * Los mensajes y los topes son los del contrato (V4 §3.10, `POST
 * /document-templates`). El backend vuelve a validar todo.
 */

export type DocumentTemplateErrors = Partial<Record<keyof DocumentTemplateFormValues, string>>

export const NAME_MAX = 150
/** 10 MB justos se aceptan; un byte más, no (CA-34.10). */
export const MAX_FILE_BYTES = 10 * 1024 * 1024

export function validateDocumentTemplate(values: DocumentTemplateFormValues): DocumentTemplateErrors {
    const errors: DocumentTemplateErrors = {}

    const name = values.name.trim()
    if (name === '') errors.name = 'El nombre del modelo es obligatorio.'
    else if (name.length > NAME_MAX) errors.name = `Puede tener hasta ${NAME_MAX} caracteres.`

    if (values.jurisdictions.length === 0) errors.jurisdictions = 'Elegí al menos un fuero.'

    // Por la extensión y no por el tipo: el navegador no siempre lo informa.
    if (values.file === null) errors.file = 'El archivo del modelo es obligatorio.'
    else if (!values.file.name.toLowerCase().endsWith('.docx')) errors.file = 'El archivo tiene que ser .docx.'
    else if (values.file.size > MAX_FILE_BYTES) errors.file = 'El archivo supera el tamaño máximo de 10 MB.'

    return errors
}

export function isValid(errors: DocumentTemplateErrors): boolean {
    return Object.keys(errors).length === 0
}
