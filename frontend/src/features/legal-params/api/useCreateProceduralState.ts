import { useMutation, useQueryClient } from '@tanstack/react-query';
import { createProceduralState } from './proceduralStates.api';
import { proceduralStateKeys } from './proceduralStates.keys';

/**
 * Alta de un estado procesal.
 *
 * La mutación es responsable de dejar la caché bien: no se delega a la
 * pantalla. Se invalida `lists()` y no `list(params)` porque un alta cambia
 * todas las páginas y todos los filtros, no sólo la que está en pantalla.
 *
 * El CLAUDE.md pide además sembrar `detail(id)` con lo que devolvió el
 * servidor. Acá no se hace: el `POST` responde sin `activeCases` (V3 D-32),
 * así que no tiene la forma de `GET /procedural-states/{id}`, y hoy ninguna
 * pantalla lee esa entrada.
 */
export function useCreateProceduralState() {
    const queryClient = useQueryClient();

    return useMutation({
        mutationFn: createProceduralState,
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: proceduralStateKeys.lists() });
        },
    });
}
