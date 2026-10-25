import { useMutation, useQueryClient } from '@tanstack/react-query';
import type { UpdateLegalQualificationBody } from '@/features/legal-params/types/legalQualification';
import { updateLegalQualification } from './legalQualifications.api';
import { legalQualificationKeys } from './legalQualifications.keys';

/** El id y el cuerpo viajan juntos: `useMutation` pasa un solo valor a `mutationFn`. */
export interface UpdateLegalQualificationArgs {
    id: number;
    body: UpdateLegalQualificationBody;
}

/**
 * Modificación de una calificación legal (HU-49).
 *
 * Se invalidan los listados: un cambio de nombre puede sacar la fila de la
 * búsqueda aplicada. No se reemplaza `detail(id)` con la respuesta porque el
 * `PATCH` no devuelve `activeCases` (V3 D-32), igual que el alta.
 *
 * Cambiar el plazo recalcula la prescripción de las causas que la registran
 * (V4 §3.5). Las claves de causas son de `cases`, que depende de este módulo y
 * no al revés: el detalle de una causa lo vuelve a pedir cuando se vence su
 * caché.
 */
export function useUpdateLegalQualification() {
    const queryClient = useQueryClient();

    return useMutation({
        mutationFn: ({ id, body }: UpdateLegalQualificationArgs) => updateLegalQualification(id, body),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: legalQualificationKeys.lists() });
        },
    });
}
