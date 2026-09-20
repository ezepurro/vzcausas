/** `POST /users`*/

import { useMutation, useQueryClient } from '@tanstack/react-query'

import { createUser } from '@/features/users/api/users.api'
import { userKeys } from '@/features/users/api/users.keys'
import type { CreateUserBody } from '@/features/users/types/user'

export function useCreateUser() {
    const queryClient = useQueryClient()

    return useMutation({
        mutationFn: (body: CreateUserBody) => createUser(body),
        onSuccess: (created) => {
            queryClient.setQueryData(userKeys.detail(created.id), created)
            //Para que se vea actualizado.
            queryClient.invalidateQueries({ queryKey: userKeys.lists() })
        },
    })
}

