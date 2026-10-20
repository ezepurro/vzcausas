import { useQuery } from '@tanstack/react-query'
import { getCase } from './cases.api'
import { casesKeys } from './cases.keys'

/** Cada cuánto se vuelve a pedir una causa cuya carpeta se está creando. */
export const FOLDER_POLL_MS = 3_000

/**
 * Una causa por id.
 *
 * El id suele salir de la URL (`/causas/:caseId`): si no es un entero
 * positivo, la consulta no sale, porque el servidor respondería `400` a algo
 * que ya se sabe inválido.
 *
 * Mientras la carpeta está `CREATING` se vuelve a pedir cada
 * `FOLDER_POLL_MS`: el servidor espera a Drive sólo un rato
 * (`CASE_FOLDER_WAIT_MS`) y el resto lo termina en segundo plano, así que
 * la única forma de enterarse de cómo terminó es volver a leer la causa.
 */
export function useCase(id: number) {
    return useQuery({
        queryKey: casesKeys.detail(id),
        queryFn: () => getCase(id),
        enabled: Number.isInteger(id) && id > 0,
        refetchInterval: (query) => (query.state.data?.folder?.status === 'CREATING' ? FOLDER_POLL_MS : false),
    })
}
