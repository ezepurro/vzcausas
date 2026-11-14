/** `POST /users`*/

import { useMutation, useQueryClient } from '@tanstack/react-query'

import { createUser } from '@/features/users/api/users.api'
import { userKeys } from '@/features/users/api/users.keys'
import type { CreateUserBody } from '@/features/users/types/user'
import { lawyerKeys } from '@/features/lawyers'

export function useCreateUser() {
    const queryClient = useQueryClient()

    return useMutation({
        mutationFn: (body: CreateUserBody) => createUser(body),
        onSuccess: (created) => {
            queryClient.setQueryData(userKeys.detail(created.id), created)
            //Para que se vea actualizado.
            queryClient.invalidateQueries({ queryKey: userKeys.lists() })
            /* El alta puede registrar una ficha de abogado nueva y la
               modificación, cambiar a cuál está vinculado: "Abogados" y el
               select de responsable de una causa tienen que enterarse. */
            queryClient.invalidateQueries({ queryKey: lawyerKeys.lists() })
        },
    })
}

