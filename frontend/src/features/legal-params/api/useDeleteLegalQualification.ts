import { useMutation, useQueryClient } from '@tanstack/react-query';
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
        onSuccess: (_data, id) => {
            queryClient.removeQueries({ queryKey: legalQualificationKeys.detail(id) });
            queryClient.invalidateQueries({ queryKey: legalQualificationKeys.lists() });
        },
    });
}
