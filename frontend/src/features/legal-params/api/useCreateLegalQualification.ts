import { useMutation, useQueryClient } from '@tanstack/react-query';
import { createLegalQualification } from './legalQualifications.api';
import { legalQualificationKeys } from './legalQualifications.keys';

/**
 * Alta de una calificación legal (HU-48).
 *
 * La mutación es responsable de dejar la caché bien: se invalida `lists()`,
 * porque un alta cambia todas las páginas y todas las búsquedas.
 *
 * El CLAUDE.md pide además sembrar `detail(id)`. Acá no se hace: el `POST` no
 * devuelve `activeCases` (V3 D-32), así que lo sembrado no sería el recurso
 * que devuelve un `GET`, y ninguna pantalla lee el detalle.
 */
export function useCreateLegalQualification() {
    const queryClient = useQueryClient();

    return useMutation({
        mutationFn: createLegalQualification,
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: legalQualificationKeys.lists() });
        },
    });
}
