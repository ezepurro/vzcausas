import { useMutation, useQueryClient } from '@tanstack/react-query'

import { updateUser } from '@/features/users/api/users.api'
import { userKeys } from '@/features/users/api/users.keys'
import type { UpdateUserBody } from '@/features/users/types/user'

/** `useMutation` pasa un solo argumento, así que los dos van en un objeto. */
interface UpdateUserVars {
    id: number
    body: UpdateUserBody
}

export function useUpdateUser() {
    const queryClient = useQueryClient()

    return useMutation({
        mutationFn: ({ id, body }: UpdateUserVars) => updateUser(id, body),
        onSuccess: (updated) => {
            queryClient.setQueryData(userKeys.detail(updated.id), updated)

            queryClient.invalidateQueries({ queryKey: userKeys.lists() })
        },
    })
}