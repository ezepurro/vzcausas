/** `POST /users`*/

import { useMutation, useQueryClient } from '@tanstack/react-query'

import { createLawyer } from '@/features/lawyers/api/lawyers.api'
import type { CreateLawyerBody } from '@/features/lawyers/types/lawyer'
import { lawyerKeys } from './lawyers.keys'

export function useCreateLawyer() {
    const queryClient = useQueryClient()

    return useMutation({
        mutationFn: (body: CreateLawyerBody) => createLawyer(body),
        onSuccess: (created) => {
            queryClient.setQueryData(lawyerKeys.detail(created.id), created)
            //Para que se vea actualizado.
            queryClient.invalidateQueries({ queryKey: lawyerKeys.lists() })
        },
    })
}

