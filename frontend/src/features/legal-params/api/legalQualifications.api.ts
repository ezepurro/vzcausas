import { http } from '@/shared/api/http';
import type { ApiItem, ApiList } from '@/api-contract/envelopes';
import type {
    CreatedLegalQualification,
    CreateLegalQualificationBody,
    LegalQualification,
    LegalQualificationListParams,
} from '@/features/legal-params/types/legalQualification';

/**
 * Todo lo que habla con el servidor, una función por endpoint (V3 §3.5).
 *
 * Siempre con `http`, nunca `fetch` ni `axios` directo: es lo que garantiza
 * que un error llegue al `catch` convertido en `ApiError`. Acá se saca el
 * envoltorio del contrato.
 *
 * Sólo el listado y el alta: modificar y dar de baja son de otra historia.
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
