import { http } from '@/shared/api/http';
import type { ApiItem, ApiList } from '@/api-contract/envelopes';
import type {
    CreatedLegalQualification,
    CreateLegalQualificationBody,
    LegalQualification,
    LegalQualificationListParams,
    UpdateLegalQualificationBody,
} from '@/features/legal-params/types/legalQualification';

/**
 * Todo lo que habla con el servidor, una función por endpoint (V4 §3.5).
 *
 * Siempre con `http`, nunca `fetch` ni `axios` directo: es lo que garantiza
 * que un error llegue al `catch` convertido en `ApiError`. Acá se saca el
 * envoltorio del contrato.
 *
 * El ABMC completo (HU-47 a HU-50): listado, alta, modificación y baja.
 */

const BASE = '/legal-qualifications';

export async function listLegalQualifications(
    params: LegalQualificationListParams,
): Promise<ApiList<LegalQualification>> {
    // De una colección se devuelve el envoltorio entero: la pantalla necesita
    // `pagination` para dibujar el paginado.
    const response = await http.get<ApiList<LegalQualification>>(BASE, {
        params: {
            page: params.page,
            limit: params.limit,
            // Un filtro vacío no viaja.
            search: params.search?.trim() || undefined,
        },
    });
    return response.data;
}

export async function createLegalQualification(
    body: CreateLegalQualificationBody,
): Promise<CreatedLegalQualification> {
    const response = await http.post<ApiItem<CreatedLegalQualification>>(BASE, body);
    return response.data.data;
}

/** Como el alta, devuelve la calificación sin `activeCases` (V3 D-32). */
export async function updateLegalQualification(
    id: number,
    body: UpdateLegalQualificationBody,
): Promise<CreatedLegalQualification> {
    const response = await http.patch<ApiItem<CreatedLegalQualification>>(`${BASE}/${id}`, body);
    return response.data.data;
}

export async function deleteLegalQualification(id: number): Promise<void> {
    // 204 sin cuerpo: no hay nada que devolver.
    await http.delete(`${BASE}/${id}`);
}
