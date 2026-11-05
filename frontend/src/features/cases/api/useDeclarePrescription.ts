import { useMutation, useQueryClient } from '@tanstack/react-query'
import type { DeclarePrescriptionBody } from '@/features/cases/types/prescriptionDeclaration'
import { declarePrescription } from './cases.api'
import { casesKeys } from './cases.keys'

/**
 * Marcar la causa como prescripta (HU33).
 *
 * El servidor devuelve la causa ya cambiada (V4 D-54): con eso se reemplaza
 * el detalle sin otra petición. La línea de vida suma el pase a "Prescripta"
 * y los listados cambian de estado, así que se invalidan.
 *
 * La mutación termina recién cuando llegó la línea de vida nueva: si no, el
 * modal se cerraría con el encabezado ya en "Prescripta" y la línea de vida
 * todavía sin el pase. Los listados no se esperan: no están en pantalla.
 */
export function useDeclarePrescription(caseId: number) {
    const queryClient = useQueryClient()

    return useMutation({
        mutationFn: (body: DeclarePrescriptionBody) => declarePrescription(caseId, body),
        onSuccess: (updated) => {
            queryClient.setQueryData(casesKeys.detail(caseId), updated)
            queryClient.invalidateQueries({ queryKey: casesKeys.lists() })
            return queryClient.invalidateQueries({ queryKey: casesKeys.timeline(caseId) })
        },
    })
}
