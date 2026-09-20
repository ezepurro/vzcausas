import { useQuery } from '@tanstack/react-query';
import type {
    Jurisdiction,
    ProceduralStatesParams,
} from '@/features/legal-params/types/proceduralState';
import { listProceduralStates } from './proceduralStates.api';
import { proceduralStateKeys } from './proceduralStates.keys';

/**
 * El ciclo de vida COMPLETO de un fuero, para el select de posición.
 *
 * No sirve el listado de la pantalla: está paginado y filtrado por el buscador,
 * y para elegir "después de «Descargo»" hace falta que «Descargo» esté en la
 * lista aunque no esté en la página que se ve ni coincida con lo que se buscó.
 *
 * `limit: 100` es el máximo del contrato y alcanza de sobra: el ciclo de un
 * fuero son unos pocos estados, no un padrón.
 *
 * La clave es la misma del listado, así que cuando los parámetros coinciden las
 * dos consultas comparten la entrada de caché en vez de pedir lo mismo dos
 * veces.
 *
 * Se pide siempre, no sólo con el modal abierto: al abrir la edición hay que
 * saber YA en qué lugar del ciclo está el estado, y pedirlo recién en ese
 * momento dejaría al formulario un instante con la lista vacía, precargando la
 * posición equivocada.
 */
export function useProceduralStateCycle(jurisdiction: Jurisdiction) {
    const params: ProceduralStatesParams = {
        page: 1,
        limit: 100,
        jurisdiction,
        active: true,
    };

    return useQuery({
        queryKey: proceduralStateKeys.list(params),
        queryFn: () => listProceduralStates(params),
    });
}
