import { useQuery } from '@tanstack/react-query'
import { getCaseTimeline } from './cases.api'
import { casesKeys } from './cases.keys'

/**
 * La línea de vida de una causa (HU27): actos procesales, actos interruptivos
 * y el pase a "Prescripta", ya intercalados por el backend.
 *
 * Igual que `useCase`, no sale con un id que no es un entero positivo.
 */
export function useCaseTimeline(caseId: number) {
    return useQuery({
        queryKey: casesKeys.timeline(caseId),
        queryFn: () => getCaseTimeline(caseId),
        enabled: Number.isInteger(caseId) && caseId > 0,
    })
}
