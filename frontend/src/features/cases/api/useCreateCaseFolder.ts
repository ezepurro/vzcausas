import { useMutation, useQueryClient } from '@tanstack/react-query'
import type { Case } from '@/features/cases/types/case'
import { createCaseFolder } from './cases.api'
import { casesKeys } from './cases.keys'

/**
 * Crea o reintenta la carpeta de la causa (HU39). La respuesta trae sólo el
 * `folder`, así que se pisa ese campo en el detalle ya cargado: el link
 * aparece sin volver a pedir la causa. Si queda `CREATING`, `useCase` sigue
 * preguntando hasta que termine.
 *
 * Si falla, la carpeta pudo haber cambiado igual (el servidor la deja en
 * `ERROR`), así que se vuelve a leer la causa.
 */
export function useCreateCaseFolder(caseId: number) {
    const queryClient = useQueryClient()

    return useMutation({
        mutationKey: casesKeys.mutation(caseId, 'createFolder'),
        mutationFn: () => createCaseFolder(caseId),
        onSuccess: (folder) => {
            queryClient.setQueryData<Case>(casesKeys.detail(caseId), (c) => (c ? { ...c, folder } : c))
        },
        onError: () => {
            queryClient.invalidateQueries({ queryKey: casesKeys.detail(caseId) })
        },
    })
}
