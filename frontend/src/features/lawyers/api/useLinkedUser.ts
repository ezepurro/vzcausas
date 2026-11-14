/** El usuario vinculado a la ficha, para avisar qué le pasa con la baja (CA-15.5, D-133). */

import { useQuery } from '@tanstack/react-query'

import { findLinkedUser } from '@/features/lawyers/api/lawyers.api'
import { lawyerKeys } from '@/features/lawyers/api/lawyers.keys'

export function useLinkedUser(lawyerId: number) {
    return useQuery({
        queryKey: lawyerKeys.linkedUser(lawyerId),
        queryFn: () => findLinkedUser(lawyerId),
        staleTime: 0,
    })
}
