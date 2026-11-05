import { useMutation, useQueryClient } from '@tanstack/react-query';
import { removeFromLists, restoreLists } from '@/shared/api/optimisticRemoval';
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
        // La fila sale de la tabla al confirmar; si la baja falla, vuelve (`optimisticRemoval`).
        onMutate: (id) => removeFromLists(queryClient, proceduralStateKeys.lists(), id),
        onError: (_error, _id, snapshot) => restoreLists(queryClient, snapshot),
        onSuccess: (_data, id) => {
            queryClient.removeQueries({ queryKey: proceduralStateKeys.detail(id) });
        },
        onSettled: () => queryClient.invalidateQueries({ queryKey: proceduralStateKeys.lists() }),
    });
}
