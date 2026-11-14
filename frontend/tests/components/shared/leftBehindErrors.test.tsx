import { useState } from 'react'
import { describe, expect, it } from 'vitest'
import { screen } from '@testing-library/react'
import { renderWithProviders } from '../../setup/render'
import { configureMocks } from '@/shared/mocks/server'
import { db } from '@/shared/mocks'
import { ApiError } from '@/shared/api/ApiError'
import { queryClient } from '@/shared/api/queryClient'
import { leftBehindMessage } from '@/shared/api/leftBehindErrors'
import { useCreateCaseFolder } from '@/features/cases/api/useCreateCaseFolder'

/**
 * Lo que falla después de salir de la pantalla que lo pidió (tanda 13 de
 * `docs/auditoria-front`).
 *
 * TanStack sólo corre el `onError` de un `mutate(…)` si el componente sigue
 * montado: si la persona salía antes de la respuesta, un rechazo del servidor
 * no lo veía nadie. Ahora lo avisa un error general. Mientras la pantalla
 * sigue ahí, el aviso es el suyo y no se agrega nada.
 *
 * Se prueba con "Crear carpeta" (`useCreateCaseFolder`) de la causa 23, con
 * Drive caído: el servidor responde 502.
 */

const PREFIX = /No se completó lo que dejaste en curso:/
const DRIVE_DOWN = 'No se pudo acceder al almacenamiento en la nube. Intentá de nuevo en unos minutos.'

/** Una pantalla que pide crear la carpeta, y un botón para salir de ella. */
function Harness() {
    const [here, setHere] = useState(true)
    return (
        <>
            {here && <FolderScreen />}
            <button type="button" onClick={() => setHere(false)}>Salir</button>
        </>
    )
}

function FolderScreen() {
    const { mutate } = useCreateCaseFolder(23)
    return <button type="button" onClick={() => mutate()}>Crear carpeta</button>
}

const leftBehindToasts = () => screen.queryAllByRole('alert').filter((el) => PREFIX.test(el.textContent ?? ''))

describe('lo que falla después de salir de la pantalla', () => {
    it('se avisa con el mensaje del servidor', async () => {
        db.failures.documentStorage = true
        configureMocks({ latencyProfile: { 'POST /cases/:caseId/folder': 200 } })
        const { user } = renderWithProviders(<Harness />, { as: 'gestion' })

        await user.click(await screen.findByRole('button', { name: 'Crear carpeta' }))
        await user.click(screen.getByRole('button', { name: 'Salir' }))

        const toast = await screen.findByRole('alert')
        expect(toast).toHaveTextContent(PREFIX)
        expect(toast).toHaveTextContent(DRIVE_DOWN)
    })

    it('mientras la pantalla sigue ahí no se agrega ningún aviso: lo avisa ella', async () => {
        db.failures.documentStorage = true
        const { user } = renderWithProviders(<Harness />, { as: 'gestion' })

        await user.click(await screen.findByRole('button', { name: 'Crear carpeta' }))
        await new Promise((resolve) => setTimeout(resolve, 300))

        expect(leftBehindToasts()).toHaveLength(0)
    })

    it('si mientras tanto se cerró la sesión (la caché se vació), no se avisa', async () => {
        db.failures.documentStorage = true
        configureMocks({ latencyProfile: { 'POST /cases/:caseId/folder': 200 } })
        const { user } = renderWithProviders(<Harness />, { as: 'gestion' })

        await user.click(await screen.findByRole('button', { name: 'Crear carpeta' }))
        await user.click(screen.getByRole('button', { name: 'Salir' }))
        // Lo que hace `signOut` en `AuthProvider`.
        queryClient.clear()
        await new Promise((resolve) => setTimeout(resolve, 400))

        expect(leftBehindToasts()).toHaveLength(0)
    })

    it('si sale bien, no se avisa nada: el resultado ya está en la caché', async () => {
        configureMocks({ latencyProfile: { 'POST /cases/:caseId/folder': 200 } })
        const { user } = renderWithProviders(<Harness />, { as: 'gestion' })

        await user.click(await screen.findByRole('button', { name: 'Crear carpeta' }))
        await user.click(screen.getByRole('button', { name: 'Salir' }))
        await new Promise((resolve) => setTimeout(resolve, 400))

        expect(screen.queryAllByRole('alert')).toHaveLength(0)
    })
})

describe('leftBehindMessage', () => {
    it('suma el mensaje del servidor', () => {
        const error = new ApiError(409, 'Ya existe una causa vigente con ese número de SAC.', 'CASE_SAC_ALREADY_EXISTS')
        expect(leftBehindMessage(error)).toBe(
            'No se completó lo que dejaste en curso: Ya existe una causa vigente con ese número de SAC.',
        )
    })

    it('no avisa una sesión vencida: la sesión se cierra y el login ya lo dice', () => {
        expect(leftBehindMessage(new ApiError(401, 'Token inválido.', 'UNAUTHENTICATED'))).toBeNull()
    })

    it('un error que no es del servidor lleva un texto general', () => {
        expect(leftBehindMessage(new TypeError('boom'))).toBe(
            'No se completó lo que dejaste en curso: Ocurrió un error inesperado.',
        )
    })
})
