import { useMutation, useQueryClient } from '@tanstack/react-query'
import type { DeclarePrescriptionBody } from '@/features/cases/types/prescriptionDeclaration'
import { declareQualificationPrescription } from './cases.api'
import { casesKeys } from './cases.keys'
import { invalidateCaseCounters } from './invalidateCaseCounters'

export interface DeclareQualificationPrescriptionVariables {
    legalQualificationId: number
    body: DeclarePrescriptionBody
}

/**
 * Declarar prescripta una calificación legal de la causa (D-113, HU33).
 *
 * Igual que `useDeclarePrescription`: el servidor devuelve la causa cambiada y
 * con eso se reemplaza el detalle; la línea de vida suma la declaración, así
 * que se espera, y los listados se invalidan porque la causa pudo pasar a
 * "Prescripta" si era la última calificación.
 */
export function useDeclareQualificationPrescription(caseId: number) {
    const queryClient = useQueryClient()

    return useMutation({
        mutationFn: ({ legalQualificationId, body }: DeclareQualificationPrescriptionVariables) =>
            declareQualificationPrescription(caseId, legalQualificationId, body),
        onSuccess: (updated) => {
            queryClient.setQueryData(casesKeys.detail(caseId), updated)
            queryClient.invalidateQueries({ queryKey: casesKeys.lists() })
            // La causa puede haber pasado a "Prescripta": deja de ser activa.
            invalidateCaseCounters(queryClient)
            return queryClient.invalidateQueries({ queryKey: casesKeys.timeline(caseId) })
        },
    })
}
