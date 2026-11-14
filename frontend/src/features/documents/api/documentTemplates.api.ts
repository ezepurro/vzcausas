import type { ApiItem, ApiList } from '@/api-contract/envelopes'
import { FILE_TRANSFER_TIMEOUT_MS, http } from '@/shared/api/http'
import type { DocumentTemplate, DocumentTemplateListParams } from '@/features/documents/types/documentTemplate'

const RESOURCE = '/document-templates'

export async function listDocumentTemplates(params: DocumentTemplateListParams = {}): Promise<ApiList<DocumentTemplate>> {
    const res = await http.get<ApiList<DocumentTemplate>>(RESOURCE, { params: {
        page: params.page,
        limit: params.limit,
        jurisdiction: params.jurisdiction,
        // Sólo viaja en `true`: sin el parámetro, el listado trae todos.
        copyToNewCases: params.copyToNewCases || undefined,
    } })
    return res.data
}

/**
 * El alta viaja como `multipart/form-data`. `http` manda JSON por defecto, y
 * con ese encabezado axios convertiría el `FormData` a JSON: hay que pedirlo
 * explícito, y axios completa el `boundary` (README de los mocks).
 */
export async function createDocumentTemplate(body: FormData): Promise<DocumentTemplate> {
    const res = await http.post<ApiItem<DocumentTemplate>>(RESOURCE, body, {
        headers: { 'Content-Type': 'multipart/form-data' },
        timeout: FILE_TRANSFER_TIMEOUT_MS,
    })
    return res.data.data
}

/** El `.docx` en su última versión (CA-35.6). La única respuesta que no es JSON. */
export async function downloadDocumentTemplateFile(templateId: number): Promise<Blob> {
    const res = await http.get<Blob>(`${RESOURCE}/${templateId}/file`, {
        responseType: 'blob',
        timeout: FILE_TRANSFER_TIMEOUT_MS,
    })
    return res.data
}
