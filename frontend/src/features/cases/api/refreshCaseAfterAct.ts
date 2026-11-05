import type { QueryClient } from '@tanstack/react-query'
import { casesKeys } from './cases.keys'

/**
 * Deja la caché de la causa al día después de un acto —procesal (registro o
 * modificación) o interruptivo— y devuelve una promesa que se cumple cuando
 * **ya llegaron la causa y su línea de vida nuevas**.
 *
 * La mutación la devuelve desde su `onSuccess`, así queda pendiente
 * ("Guardando…") hasta entonces. Si no se esperara, el detalle mostraría por
 * un instante lo que tenía en la caché: el estado y el plazo viejos al volver
 * de "Registrar acto", o la barra de prescripción vieja al cerrar el modal
 * del acto interruptivo, y la línea de vida sin el acto.
 *
 * - Todo lo que cuelga del detalle queda marcado viejo.
 * - La causa y la línea de vida se vuelven a pedir ya, estén o no en
 *   pantalla (la línea de vida no lo está en "Registrar acto"), y se esperan.
 *   Si alguna nunca se pidió, no hay nada que pedir: se pide al montarse.
 * - Los documentos y la carátula no cambian con un acto: no se esperan,
 *   porque leerlos pasa por Drive y es lo más lento. Quedan viejos y se piden
 *   de nuevo la próxima vez que se monten.
 * - Los listados tampoco se esperan: no están en pantalla.
 *
 * Un error al volver a pedir no hace fallar la mutación: el acto ya se guardó.
 */
export function refreshCaseAfterAct(queryClient: QueryClient, caseId: number): Promise<unknown> {
    queryClient.invalidateQueries({ queryKey: casesKeys.lists() })
    queryClient.invalidateQueries({ queryKey: casesKeys.detail(caseId), refetchType: 'none' })
    return Promise.all([
        queryClient.refetchQueries({ queryKey: casesKeys.detail(caseId), exact: true }),
        queryClient.refetchQueries({ queryKey: casesKeys.timeline(caseId) }),
    ])
}
