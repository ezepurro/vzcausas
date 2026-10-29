import { http } from '@/shared/api/http'
import type { ApiItem } from '@/api-contract/envelopes'
import type { Case, CaseFolder, CreateCaseBody, UpdateCaseBody } from '@/features/cases/types/case'
import type {  ApiList } from '@/api-contract/envelopes'
import type { CaseListParams } from '@/features/cases/types/case'
import type { Jurisdiction } from '@/features/legal-params'
import type { DeclarePrescriptionBody } from '@/features/cases/types/prescriptionDeclaration'
import type { TimelineEntry } from '@/features/cases/types/timeline'
import type { DeleteCaseBody } from '@/features/cases/types/caseDeletion'
import type { CaseDocumentList } from '@/features/cases/types/caseDocument'
import type { CreateCaseFileBody, FileDisposition, GeneratedCaseFile } from '@/features/cases/types/caseFile'

/**
 * Todo lo que habla con el servidor, una función por endpoint.
 *
 * Siempre con `http`, nunca `fetch` ni `axios` directo: es lo que garantiza
 * que un error llegue al `catch` convertido en `ApiError`. Acá se saca el
 * envoltorio del contrato: para afuera sale el recurso pelado.
 *
 * Los actos interruptivos, que son un recurso anidado, van en
 * `interruptiveActs.api.ts`.
 */

const BASE = '/cases'

export async function getCases(params: CaseListParams = {}): Promise<ApiList<Case>> {
    const response = await http.get<ApiList<Case>>(BASE, { params: {...params, search: params.search?.trim() || undefined } })
    return response.data
}

/**
 * Los estados escritos a mano que tienen hoy las causas: el grupo "Escritos a
 * mano en causas" del filtro de estado. Es la única colección sin paginar.
 */
export async function getCustomStates(jurisdiction?: Jurisdiction): Promise<string[]> {
    const response = await http.get<ApiItem<string[]>>(`${BASE}/custom-states`, { params: { jurisdiction }})
    return response.data.data
}
export async function getCase(id: number): Promise<Case> {
    const response = await http.get<ApiItem<Case>>(`${BASE}/${id}`)
    return response.data.data
}

export async function createCase(body: CreateCaseBody): Promise<Case> {
    const response = await http.post<ApiItem<Case>>(BASE, body)
    return response.data.data
}

/**
 * Modifica la causa (HU19, V5 §3.7). El cuerpo lleva sólo lo que cambió y
 * nunca va vacío (`buildCasePatch`). Devuelve la causa completa, igual que
 * `GET /cases/{caseId}`.
 */
export async function updateCase(id: number, body: UpdateCaseBody): Promise<Case> {
    const response = await http.patch<ApiItem<Case>>(`${BASE}/${id}`, body)
    return response.data.data
}

/**
 * Da de baja la causa (HU21, V5 §3.7). Es el único `DELETE` del contrato con
 * cuerpo: el motivo, que es opcional. Sin motivo no se manda cuerpo y la baja
 * procede igual. Responde `204` sin cuerpo.
 */
export async function deleteCase(id: number, body?: DeleteCaseBody): Promise<void> {
    await http.delete(`${BASE}/${id}`, { data: body })
}
/**
 * La línea de vida de la causa (HU27, V4 D-85). Sin paginar, a propósito: una
 * línea de vida cortada en la página 1 sería incorrecta sin que nada lo delate.
 */
export async function getCaseTimeline(id: number): Promise<TimelineEntry[]> {
    const response = await http.get<ApiItem<TimelineEntry[]>>(`${BASE}/${id}/timeline`)
    return response.data.data
}

/** Marca la causa como prescripta (HU33). Devuelve la causa ya cambiada (D-54). */
export async function declarePrescription(id: number, body: DeclarePrescriptionBody): Promise<Case> {
    const response = await http.post<ApiItem<Case>>(`${BASE}/${id}/prescription`, body)
    return response.data.data
}

/**
 * Crea la carpeta de una causa que no la tiene, o la reintenta si falló
 * (HU39, `POST /cases/{caseId}/folder`). Es idempotente: sobre una carpeta
 * creada o en creación devuelve la que hay. Devuelve sólo el `folder`.
 */
export async function createCaseFolder(id: number, copyTemplates = true): Promise<CaseFolder> {
    const response = await http.post<ApiItem<CaseFolder>>(`${BASE}/${id}/folder`, { copyTemplates })
    return response.data.data
}
/**
 * Los documentos de la carpeta de la causa en Drive (HU38, V5 §3.12). Se leen
 * de Drive en cada pedido y no están paginados. Es un objeto, no una lista:
 * trae además la situación de la carpeta y cuándo se leyó.
 */
export async function getCaseDocuments(id: number): Promise<CaseDocumentList> {
    const response = await http.get<ApiItem<CaseDocumentList>>(`${BASE}/${id}/documents`)
    return response.data.data
}


/**
 * La hoja de carátula en PDF (HU24, V5 §3.7). El backend la arma en cada
 * pedido con los datos vigentes de la causa, y no necesita la carpeta. Va
 * `inline` por defecto: es la vista previa de "Generar expediente".
 */
export async function getCaseCover(id: number, disposition: FileDisposition = 'inline'): Promise<Blob> {
    const response = await http.get<Blob>(`${BASE}/${id}/cover`, { params: { disposition }, responseType: 'blob' })
    return response.data
}

/**
 * El expediente puede tardar más que un pedido común: es sincrónico y no
 * tiene un límite de tamaño en el contrato (C-29). Si el cliente cortara a
 * los 15 s de `http`, el backend lo guardaría igual y un reintento generaría
 * otra versión.
 */
const CASE_FILE_TIMEOUT_MS = 120_000

/**
 * Genera el expediente (HU25, V5 §3.12): la carátula y los documentos
 * elegidos, en ese orden, en un único PDF que queda guardado como versión
 * nueva en la carpeta de la causa.
 */
export async function createCaseFile(id: number, body: CreateCaseFileBody): Promise<GeneratedCaseFile> {
    const response = await http.post<ApiItem<GeneratedCaseFile>>(`${BASE}/${id}/case-files`, body, {
        timeout: CASE_FILE_TIMEOUT_MS,
    })
    return response.data.data
}

/**
 * Descarga un archivo de la carpeta de la causa (HU38, HU25). Pasa por la API
 * y no por el enlace de Drive porque un Administrador sin otro rol no tiene
 * acceso a la carpeta (D-103). Un expediente lo descarga cualquiera; otro
 * documento, sólo `LAWYER` o `SECRETARY` (`403`).
 */
export async function downloadCaseDocumentFile(
    caseId: number,
    documentId: string,
    disposition: FileDisposition = 'attachment',
): Promise<Blob> {
    const response = await http.get<Blob>(
        `${BASE}/${caseId}/documents/${encodeURIComponent(documentId)}/file`,
        { params: { disposition }, responseType: 'blob' },
    )
    return response.data
}
