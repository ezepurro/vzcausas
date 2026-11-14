import { useMutation, useQueryClient } from '@tanstack/react-query'
import type { CreateCaseFileBody } from '@/features/cases/types/caseFile'
import { createCaseFile } from './cases.api'
import { casesKeys } from './cases.keys'

/**
 * Generar el expediente (HU25).
 *
 * El expediente nuevo es un archivo más de la carpeta: se invalida la lista
 * de documentos, para que aparezca en "Documentación" y para que la pantalla
 * deje de ofrecerlo (un expediente no se incluye en otro).
 *
 * El detalle de la causa no se toca: generar un expediente no cambia ni el
 * estado ni la carátula (CA-25.11).
 */
export function useCreateCaseFile(caseId: number) {
    const queryClient = useQueryClient()

    return useMutation({
        mutationKey: casesKeys.mutation(caseId, 'createCaseFile'),
        mutationFn: (body: CreateCaseFileBody) => createCaseFile(caseId, body),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: casesKeys.documents(caseId) })
        },
    })
}
