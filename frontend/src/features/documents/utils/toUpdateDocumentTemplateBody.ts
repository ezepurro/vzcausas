import type { DocumentTemplateChanges } from '@/features/documents/types/documentTemplate'

/**
 * De lo que cambió al cuerpo del `PATCH /document-templates/{templateId}`,
 * que es `multipart/form-data` como el alta, porque puede llevar el archivo
 * (V6 §3.10). Viaja sólo lo que está en `changes`; `jurisdictions` se repite
 * una vez por fuero.
 */
export function toUpdateDocumentTemplateBody(changes: DocumentTemplateChanges): FormData {
    const body = new FormData()
    if (changes.name !== undefined) body.append('name', changes.name)
    if (changes.jurisdictions !== undefined) {
        for (const jurisdiction of changes.jurisdictions) body.append('jurisdictions', jurisdiction)
    }
    if (changes.copyToNewCases !== undefined) body.append('copyToNewCases', String(changes.copyToNewCases))
    if (changes.file) body.append('file', changes.file, changes.file.name)
    return body
}