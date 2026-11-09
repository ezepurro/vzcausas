import { useMutation, useQueryClient } from '@tanstack/react-query';
import { removeFromLists, restoreLists } from '@/shared/api/optimisticRemoval';
import { deleteLegalQualification } from './legalQualifications.api';
import { legalQualificationKeys } from './legalQualifications.keys';

/**
 * Baja de una calificación legal (HU-50).
 *
 * `detail(id)` se REMUEVE, no se invalida: invalidarlo dispararía un GET del
 * recurso que acaba de dejar de existir, y eso da 404. Las causas que la
 * registran la conservan (V4 §3.5), así que no hay nada de `cases` que tocar.
 */
export function useDeleteLegalQualification() {
    const queryClient = useQueryClient();

    return useMutation({
        mutationFn: deleteLegalQualification,
        // La fila sale de la tabla al confirmar; si la baja falla, vuelve (`optimisticRemoval`).
        onMutate: (id) => removeFromLists(queryClient, legalQualificationKeys.lists(), id),
        onError: (_error, _id, snapshot) => restoreLists(queryClient, snapshot),
        onSuccess: (_data, id) => {
            queryClient.removeQueries({ queryKey: legalQualificationKeys.detail(id) });
        },
        onSettled: () => queryClient.invalidateQueries({ queryKey: legalQualificationKeys.lists() }),
    });
}
