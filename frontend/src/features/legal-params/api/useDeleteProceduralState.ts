import { useMutation, useQueryClient } from '@tanstack/react-query';
import { deleteProceduralState } from './proceduralStates.api';
import { proceduralStateKeys } from './proceduralStates.keys';

/**
 * Baja de un estado procesal.
 *
 * `detail(id)` se REMUEVE, no se invalida: invalidar dispara un GET del
 * recurso que acaba de dejar de existir, y eso da 404. Hoy ninguna pantalla
 * usa `GET /procedural-states/{id}`, pero la remoción queda escrita para
 * cuando alguna lo haga.
 *
 * El segundo parámetro de `onSuccess` son las variables con las que se llamó
 * a la mutación: acá, el id que se borró.
 */
export function useDeleteProceduralState() {
    const queryClient = useQueryClient();

    return useMutation({
        mutationFn: deleteProceduralState,
        onSuccess: (_data, id) => {
            queryClient.removeQueries({ queryKey: proceduralStateKeys.detail(id) });
            queryClient.invalidateQueries({ queryKey: proceduralStateKeys.lists() });
        },
    });
}
