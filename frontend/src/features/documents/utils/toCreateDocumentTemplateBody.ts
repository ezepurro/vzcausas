import type { DocumentTemplateFormValues } from '@/features/documents/types/documentTemplate'

/**
 * Del formulario al cuerpo del alta, que es `multipart/form-data` porque
 * lleva el archivo (V4 §3.10). `jurisdictions` se repite una vez por fuero;
 * "Todos los fueros" son los tres valores.
 */
export function toCreateDocumentTemplateBody(values: DocumentTemplateFormValues): FormData {
    const body = new FormData()
    body.append('name', values.name.trim())
    for (const jurisdiction of values.jurisdictions) body.append('jurisdictions', jurisdiction)
    body.append('copyToNewCases', String(values.copyToNewCases))
    if (values.file) body.append('file', values.file, values.file.name)
    return body
}
