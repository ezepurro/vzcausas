import { http } from '@/shared/api/http';
import type { ApiItem, ApiList } from '@/api-contract/envelopes';
import type {
    CreateProceduralStateBody,
    ProceduralState,
    ProceduralStatesParams,
    SavedProceduralState,
    UpdateProceduralStateBody,
} from '@/features/legal-params/types/proceduralState';

/**
 * Todo lo que habla con el servidor, una función por endpoint.
 *
 * Siempre con `http`, nunca `fetch` ni `axios` directo: es lo que garantiza
 * que un error llegue al `catch` convertido en `ApiError`.
 *
 * Acá se saca el envoltorio del contrato. Ni los hooks ni las pantallas tienen
 * que saber que la respuesta viene envuelta ni que abajo hay axios.
 */

const BASE = '/procedural-states';

export async function listProceduralStates(
    params: ProceduralStatesParams,
): Promise<ApiList<ProceduralState>> {
    // De una colección se devuelve el envoltorio entero: la pantalla necesita
    // `pagination` para dibujar el paginado.
    const response = await http.get<ApiList<ProceduralState>>(BASE, { params });
    return response.data;
}

export async function createProceduralState(
    body: CreateProceduralStateBody,
): Promise<SavedProceduralState> {
    // `response.data` es el cuerpo HTTP; el `.data` de adentro es el envoltorio
    // del contrato. El doble `data` termina acá: para afuera sale el recurso pelado.
    // Viene sin `activeCases`, que es sólo de los `GET` (V3 D-32).
    const response = await http.post<ApiItem<SavedProceduralState>>(BASE, body);
    return response.data.data;
}

export async function updateProceduralState(
    id: number,
    body: UpdateProceduralStateBody,
): Promise<SavedProceduralState> {
    const response = await http.patch<ApiItem<SavedProceduralState>>(`${BASE}/${id}`, body);
    return response.data.data;
}

export async function deleteProceduralState(id: number): Promise<void> {
    // 204 sin cuerpo: no hay nada que devolver.
    await http.delete(`${BASE}/${id}`);
}
