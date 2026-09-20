import { useMutation, useQueryClient } from '@tanstack/react-query';
import type { UpdateProceduralStateBody } from '@/features/legal-params/types/proceduralState';
import { updateProceduralState } from './proceduralStates.api';
import { proceduralStateKeys } from './proceduralStates.keys';

/**
 * Argumentos de la edición.
 *
 * `useMutation` pasa un solo valor a `mutationFn`, así que el id y el cuerpo
 * viajan juntos en un objeto en vez de como dos parámetros.
 */
export interface UpdateProceduralStateArgs {
    id: number;
    body: UpdateProceduralStateBody;
}

/**
 * Edición de un estado procesal.
 *
 * Igual que el alta: invalida todos los listados. Un cambio de nombre o de
 * fuero puede sacar la fila del filtro que está aplicado, así que no alcanza
 * con refrescar la página actual.
 */
export function useUpdateProceduralState() {
    const queryClient = useQueryClient();

    return useMutation({
        mutationFn: ({ id, body }: UpdateProceduralStateArgs) => updateProceduralState(id, body),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: proceduralStateKeys.lists() });
        },
    });
}
