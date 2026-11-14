import { describe, expect, it, vi } from 'vitest'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { LoadError } from '@/shared/components/ui'
import { ApiError } from '@/shared/api/ApiError'

/**
 * Lo que se ve en lugar de un listado o una pantalla que no se pudo cargar
 * (tanda 14 de `docs/auditoria-front`). Antes cada pantalla armaba su bloque a
 * mano, sin alerta para el lector de pantalla y sin forma de volver a intentar.
 */
describe('LoadError', () => {
    it('anuncia qué falló, con el mensaje del servidor, y "Reintentar" vuelve a pedir', async () => {
        const onRetry = vi.fn()
        render(
            <LoadError
                title="No se pudieron cargar las causas"
                error={new ApiError(500, 'Error del servidor. Intentá de nuevo en unos minutos.')}
                onRetry={onRetry}
            />,
        )

        const alert = screen.getByRole('alert')
        expect(alert).toHaveTextContent('No se pudieron cargar las causas')
        expect(alert).toHaveTextContent('Error del servidor. Intentá de nuevo en unos minutos.')

        await userEvent.click(screen.getByRole('button', { name: 'Reintentar' }))
        expect(onRetry).toHaveBeenCalledOnce()
    })

    it('sin red también ofrece reintentar', () => {
        render(<LoadError title="No se pudo cargar la causa" error={new ApiError(0, 'Error de red.')} onRetry={() => {}} />)
        expect(screen.getByRole('button', { name: 'Reintentar' })).toBeInTheDocument()
    })

    it('no ofrece reintentar lo que va a responder lo mismo: una causa que no existe o se dio de baja', () => {
        render(
            <LoadError
                title="No se pudo cargar la causa"
                error={new ApiError(404, 'La causa no existe.', 'CASE_NOT_FOUND')}
                onRetry={() => {}}
            />,
        )
        expect(screen.getByRole('alert')).toHaveTextContent('La causa no existe.')
        expect(screen.queryByRole('button', { name: /reintentar/i })).not.toBeInTheDocument()
    })

    it('mientras vuelve a pedir, el botón espera', () => {
        render(<LoadError title="No se pudo cargar el tablero" error={new ApiError(503, 'Caído.')} onRetry={() => {}} retrying />)
        expect(screen.getByRole('button', { name: 'Reintentando…' })).toBeDisabled()
    })
})
