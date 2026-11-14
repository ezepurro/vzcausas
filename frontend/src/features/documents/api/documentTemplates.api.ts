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

/**
 * `PATCH /document-templates/{templateId}` (HU36). Como el alta, en
 * `multipart/form-data` y con el tiempo de espera de los archivos, porque
 * puede llevar uno. El cuerpo lo arma `toUpdateDocumentTemplateBody` con lo
 * que cambió.
 */
export async function updateDocumentTemplate(id: number, body: FormData): Promise<DocumentTemplate> {
    const res = await http.patch<ApiItem<DocumentTemplate>>(`${RESOURCE}/${id}`, body, {
        headers: { 'Content-Type': 'multipart/form-data' },
        timeout: FILE_TRANSFER_TIMEOUT_MS,
    })
    return res.data.data
}

/** `DELETE /document-templates/{templateId}` (HU37). Sin cuerpo; responde `204`. */
export async function deleteDocumentTemplate(id: number): Promise<void> {
    await http.delete(`${RESOURCE}/${id}`)
}

/** El `.docx` en su última versión (CA-35.6). La única respuesta que no es JSON. */
export async function downloadDocumentTemplateFile(templateId: number): Promise<Blob> {
    const res = await http.get<Blob>(`${RESOURCE}/${templateId}/file`, {
        responseType: 'blob',
        timeout: FILE_TRANSFER_TIMEOUT_MS,
    })
    return res.data
}