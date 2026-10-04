import { useQuery } from '@tanstack/react-query'
import { getCase } from './cases.api'
import { casesKeys } from './cases.keys'

/**
 * Una causa por id.
 *
 * El id suele salir de la URL (`/causas/:caseId`): si no es un entero
 * positivo, la consulta no sale, porque el servidor respondería `400` a algo
 * que ya se sabe inválido.
 */
export function useCase(id: number) {
    return useQuery({
        queryKey: casesKeys.detail(id),
        queryFn: () => getCase(id),
        enabled: Number.isInteger(id) && id > 0,
    })
}
