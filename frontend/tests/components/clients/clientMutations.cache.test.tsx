import type { ReactNode } from 'react'
import { describe, expect, it } from 'vitest'
import { act, renderHook, waitFor } from '@testing-library/react'
import { QueryClientProvider } from '@tanstack/react-query'
import { signInAs } from '../../setup/render'
import { queryClient } from '@/shared/api/queryClient'
import { casesKeys } from '@/features/cases'
import { clientKeys } from '@/features/clients'
import { useUpdateClient } from '@/features/clients/api/useUpdateClient'
import { useDeleteClient } from '@/features/clients/api/useDeleteClient'

/**
 * La caché después de modificar o dar de baja un cliente (HU-10, HU-11).
 *
 * El cliente no se copia en sus causas: lo referencian (CA-10.2), y el detalle
 * de la causa lo muestra en su tarjeta. Si además cambia el nombre, el backend
 * cambia la carátula de sus causas (CA-10.9). Las claves de causas son de un
 * módulo que depende de `clients`, así que no se pueden nombrar desde ahí: se
 * marca vieja toda la caché, como en "Modificar abogado" (`useUpdateLawyer`).
 *
 * Dado de baja, el cliente no se ofrece más en el selector de "Registrar
 * causa" (CA-11.3), que lee `clientKeys.list` con `limit: 100`.
 */

const CLIENT_SELECTOR = clientKeys.list({ page: 1, limit: 100, search: '' })
const CLIENT_LIST = clientKeys.list({ page: 1, limit: 20 })
const CASE_LIST = casesKeys.list({ page: 1 })
const CASE_DETAIL = casesKeys.detail(1)

function seed() {
    for (const key of [CLIENT_SELECTOR, CLIENT_LIST, CASE_LIST, CASE_DETAIL]) {
        queryClient.setQueryData(key, { data: [] })
    }
    queryClient.setQueryData(clientKeys.detail(18), { id: 18 })
}

const isStale = (key: readonly unknown[]) => queryClient.getQueryState(key)?.isInvalidated === true

const wrapper = ({ children }: { children: ReactNode }) => (
    <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
)

describe('clientes · caché de las mutaciones', () => {
    /* CA-10.9: la carátula de sus causas cambió; se vuelven a pedir. */
    it('cambiar el nombre marca viejas las causas y los listados de clientes', async () => {
        signInAs('gestion')
        seed()
        const { result } = renderHook(() => useUpdateClient(), { wrapper })

        act(() => result.current.mutate({ id: 1, body: { lastName: 'GÓMEZ PAZ' } }))

        await waitFor(() => expect(result.current.isSuccess).toBe(true))
        for (const key of [CASE_LIST, CASE_DETAIL, CLIENT_LIST, CLIENT_SELECTOR]) {
            expect(isStale(key), JSON.stringify(key)).toBe(true)
        }
    })

    /* CA-10.2: el detalle de la causa muestra el teléfono en la tarjeta del cliente. */
    it('cambiar el teléfono también marca vieja la causa', async () => {
        signInAs('gestion')
        seed()
        const { result } = renderHook(() => useUpdateClient(), { wrapper })

        act(() => result.current.mutate({ id: 1, body: { phone: '351 400-1122' } }))

        await waitFor(() => expect(result.current.isSuccess).toBe(true))
        expect(isStale(CASE_DETAIL)).toBe(true)
        expect(isStale(CLIENT_LIST)).toBe(true)
    })

    /* CA-11.3: dado de baja, deja de ofrecerse para una causa nueva. */
    it('dar de baja quita el detalle y marca viejos los listados, también el del selector', async () => {
        signInAs('gestion')
        seed()
        const { result } = renderHook(() => useDeleteClient(), { wrapper })

        // JUÁREZ (18) no tiene causas.
        act(() => result.current.mutate({ id: 18, body: {} }))

        await waitFor(() => expect(result.current.isSuccess).toBe(true))
        // Se REMUEVE, no se invalida: invalidarlo pediría el detalle, que da 404.
        expect(queryClient.getQueryState(clientKeys.detail(18))).toBeUndefined()
        expect(isStale(CLIENT_SELECTOR)).toBe(true)
        expect(isStale(CLIENT_LIST)).toBe(true)
    })
})
