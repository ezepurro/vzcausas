import type { ReactNode } from 'react'
import { describe, expect, it } from 'vitest'
import { act, renderHook, waitFor } from '@testing-library/react'
import { QueryClientProvider } from '@tanstack/react-query'
import { signInAs } from '../../setup/render'
import { queryClient } from '@/shared/api/queryClient'
import { lawyerKeys } from '@/features/lawyers'
import { userKeys } from '@/features/users/api/users.keys'
import { useCreateUser } from '@/features/users/api/useCreateUser'
import { useUpdateUser } from '@/features/users/api/useUpdateUser'

/**
 * C-2 de la auditoría de caché (`docs/auditoria-front/12-REGISTRO_PLAN_A.md`):
 * registrar un usuario puede registrar también su ficha de abogado, y
 * modificarlo puede cambiar a qué ficha está vinculado. "Abogados" y el
 * "Abogado responsable" del alta de causa tienen que enterarse: antes, el
 * abogado nuevo no aparecía hasta que se vencía la caché (un minuto).
 */

const LAWYER_LISTS = [lawyerKeys.list({ page: 1 }), lawyerKeys.list({ page: 1, limit: 100 })]
const USER_LIST = userKeys.list({ page: 1 })

function seed() {
    for (const key of [...LAWYER_LISTS, USER_LIST]) queryClient.setQueryData(key, { data: [] })
}

const isStale = (key: readonly unknown[]) => queryClient.getQueryState(key)?.isInvalidated === true

const wrapper = ({ children }: { children: ReactNode }) => (
    <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
)

describe('usuarios · caché de abogados (C-2)', () => {
    it('registrar un usuario con ficha nueva marca viejos los listados de abogados', async () => {
        signInAs('fvazquez')
        seed()
        const { result } = renderHook(() => useCreateUser(), { wrapper })

        act(() =>
            result.current.mutate({
                username: 'nbarrios',
                lastName: 'Barrios',
                firstName: 'Nora',
                email: 'nbarrios@vzcausas.test',
                password: 'Clave-segura-1',
                roles: ['LAWYER'],
                lawyer: { lastName: 'Barrios', firstName: 'Nora' },
            }),
        )

        await waitFor(() => expect(result.current.isSuccess).toBe(true))
        for (const key of LAWYER_LISTS) expect(isStale(key), JSON.stringify(key)).toBe(true)
        expect(isStale(USER_LIST)).toBe(true)
    })

    it('vincular un usuario a otra ficha marca viejos los listados de abogados', async () => {
        signInAs('fvazquez')
        seed()
        const { result } = renderHook(() => useUpdateUser(), { wrapper })

        // `ravila` (9) es de Secretaría; pasa a ejercer con la ficha de Campos (9), que no tenía usuario.
        act(() => result.current.mutate({ id: 9, body: { roles: ['SECRETARY', 'LAWYER'], lawyerId: 9 } }))

        await waitFor(() => expect(result.current.isSuccess).toBe(true))
        for (const key of LAWYER_LISTS) expect(isStale(key), JSON.stringify(key)).toBe(true)
        expect(isStale(USER_LIST)).toBe(true)
    })
})
