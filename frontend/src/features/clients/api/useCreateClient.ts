import { useMutation, useQueryClient } from '@tanstack/react-query'
import { createClient } from '@/features/clients/api/clients.api'
import { clientKeys } from '@/features/clients/api/clients.keys'
import type { CreateClientBody } from '@/features/clients/types/client'

export function useCreateClient() {
    const queryClient = useQueryClient()
    return useMutation({
        mutationFn: (body: CreateClientBody) => createClient(body),
        onSuccess: (created) => {
            queryClient.setQueryData(clientKeys.detail(created.id), created)
            // Un alta cambia todas las páginas, no sólo la que está en pantalla.
            queryClient.invalidateQueries({queryKey: clientKeys.lists()})
        }
    })
}