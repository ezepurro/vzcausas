import { describe, expect, it } from 'vitest'
import { screen, waitFor, within } from '@testing-library/react'
import { http, HttpResponse } from 'msw'
import { errorBody } from '@/shared/mocks'
import { server } from '@/shared/mocks/server'
import { CaseDetailPage } from '@/features/cases/pages/CaseDetailPage'
import { RegisterProceduralActPage } from '@/features/proceedings/pages/RegisterProceduralActPage'
import { renderWithProviders } from '../../setup/render'
import { usePrototypeToday } from '../../setup/clock'

/**
 * Las causas semilla que usa: la 1 (penal, GÓMEZ) y la 9 (archivada), de
 * `mrios`, y la 2 (administrativa), de `iperalta`. Sólo el abogado
 * responsable registra actos (V3 D-30). El día está fijo en el del prototipo, martes 15/09/2026: una
 * cédula de 3 días hábiles registrada hoy vence el viernes 18/09/2026.
 */
function renderPage(caseId: string | number, as = 'mrios') {
    return renderWithProviders(<RegisterProceduralActPage />, {
        as,
        route: `/causas/${caseId}/acto`,
        path: '/causas/:caseId/acto',
        routes: [{ path: '/causas/:caseId', element: <p>Detalle de la causa</p> }],
    })
}

describe('RegisterProceduralActPage', () => {
    usePrototypeToday()

    // V4 D-69: los estados terminales se ofrecen, avisando que cierran la causa.
    it('ofrece los estados terminales, avisando que cierran la causa', async () => {
        const { user } = renderPage(1)

        await user.click(await screen.findByRole('combobox'))

        expect(screen.getByRole('option', { name: /Cédula de notificación/ })).toBeInTheDocument()
        expect(screen.getByRole('option', { name: /Archivada/ })).toHaveTextContent('Cierra la causa')
    })

    /* Topes de V5: estado a mano 255 y observaciones 2000, con contador. */
    it('el estado a mano y las observaciones traen su tope', async () => {
        renderPage(1)

        expect(await screen.findByRole('combobox')).toHaveAttribute('maxlength', '255')
        expect(screen.getByLabelText(/^Observaciones/)).toHaveAttribute('maxlength', '2000')
        expect(screen.getByText('0 / 2000')).toBeInTheDocument()
    })

    it('elegir un estado pide el vencimiento, y registrar vuelve al detalle', async () => {
        const { user } = renderPage(1)

        await user.click(await screen.findByRole('combobox'))
        await user.click(screen.getByRole('option', { name: /Cédula de notificación/ }))

        expect(await screen.findByText('18/09/2026')).toBeInTheDocument()
        expect(screen.getByText('viernes · faltan 3 días hábiles')).toBeInTheDocument()

        await user.click(screen.getByRole('button', { name: 'Registrar acto' }))

        expect(await screen.findByText('Detalle de la causa')).toBeInTheDocument()
        expect(screen.getByRole('status')).toHaveTextContent(
            'Acto registrado. La causa pasó a Cédula de notificación · vencimiento el 18/09/2026.',
        )
    })

    it('con el ajuste manual, el recuadro muestra la fecha cargada y el acto se registra con ella', async () => {
        const { user } = renderPage(1)

        await user.click(await screen.findByRole('combobox'))
        await user.click(screen.getByRole('option', { name: /Cédula de notificación/ }))
        expect(await screen.findByText('18/09/2026')).toBeInTheDocument()

        await user.click(screen.getByRole('checkbox', { name: /Ajustar el vencimiento manualmente/ }))
        await user.type(screen.getByLabelText(/^Vencimiento manual/), '2026-09-25')

        // "Vence el" pasa a la fecha manual, con su día; la de la tabla queda abajo (CA-26.5).
        // Los días hábiles que faltan no se muestran: los cuenta sólo el backend (D-20).
        expect(screen.getByText('Vence el · ajustado a mano')).toBeInTheDocument()
        expect(screen.getByText('viernes')).toBeInTheDocument()
        expect(screen.getByText('Según la tabla vencía el 18/09/2026.')).toBeInTheDocument()
        expect(screen.queryByText(/faltan \d/)).not.toBeInTheDocument()

        await user.click(screen.getByRole('button', { name: 'Registrar acto' }))

        expect(await screen.findByText('Detalle de la causa')).toBeInTheDocument()
        expect(screen.getByRole('status')).toHaveTextContent('vencimiento el 25/09/2026')
    })

    it('un estado escrito a mano se registra sin plazo de tabla', async () => {
        const { user } = renderPage(1)

        await user.type(await screen.findByRole('combobox'), 'Pedido de informes al Registro')

        expect(screen.getByText(/Estado escrito a mano: queda guardado solo en esta causa/)).toBeInTheDocument()
        expect(screen.getByText('No tiene: estado escrito a mano')).toBeInTheDocument()

        await user.click(screen.getByRole('button', { name: 'Registrar acto' }))

        expect(await screen.findByText('Detalle de la causa')).toBeInTheDocument()
        expect(screen.getByRole('status')).toHaveTextContent('Acto registrado. La causa pasó a Pedido de informes al Registro.')
    })

    it('enviado sin estado, marca el campo y no registra', async () => {
        const { user } = renderPage(1)

        await user.click(await screen.findByRole('button', { name: 'Registrar acto' }))

        expect(screen.getByText('Elegí de la lista o escribí el estado al que pasa la causa.')).toBeInTheDocument()
        expect(screen.queryByText('Detalle de la causa')).not.toBeInTheDocument()
    })

    it('en el administrativo, el plazo espera la fecha de notificación', async () => {
        const { user } = renderPage(2, 'iperalta')

        await user.click(await screen.findByRole('combobox'))
        await user.click(screen.getByRole('option', { name: /Presentación de descargo/ }))

        expect(screen.getByText('Cargá la fecha de notificación: en el fuero administrativo el plazo corre desde ahí.'))
            .toBeInTheDocument()

        await user.click(screen.getByRole('button', { name: 'Registrar acto' }))

        expect(screen.getByText('En el fuero administrativo el plazo corre desde la notificación: cargá su fecha.'))
            .toBeInTheDocument()
    })

    it('una causa en estado terminal no ofrece el formulario', async () => {
        const { user } = renderPage(9)

        expect(await screen.findByText('La causa no admite actos procesales')).toBeInTheDocument()
        expect(screen.queryByRole('combobox')).not.toBeInTheDocument()

        await user.click(screen.getByRole('button', { name: 'Volver a la causa' }))
        expect(await screen.findByText('Detalle de la causa')).toBeInTheDocument()
    })

    it('un 400 del servidor se marca en el campo', async () => {
        server.use(
            http.post('*/cases/:caseId/procedural-acts', () =>
                HttpResponse.json(
                    errorBody('VALIDATION_ERROR', 'Los datos enviados no son válidos.', {
                        proceduralStateId: 'El estado procesal no pertenece al fuero de la causa o es terminal.',
                    }),
                    { status: 400 },
                ),
            ),
        )
        const { user } = renderPage(1)

        await user.click(await screen.findByRole('combobox'))
        await user.click(screen.getByRole('option', { name: /Cédula de notificación/ }))
        await user.click(screen.getByRole('button', { name: 'Registrar acto' }))

        expect(await screen.findByText('El estado procesal no pertenece al fuero de la causa o es terminal.'))
            .toBeInTheDocument()
        expect(screen.queryByText('Detalle de la causa')).not.toBeInTheDocument()
    })

    it.each([
        ['otro abogado', 'iperalta'],
    ])('a %s le avisa quién es el responsable, sin formulario', async (_, username) => {
        const { user } = renderPage(1, username)

        expect(await screen.findByText('Solo el abogado responsable registra actos procesales')).toBeInTheDocument()
        expect(screen.getByText(/^El responsable de esta causa es .*Malena Ríos\.$/)).toBeInTheDocument()
        expect(screen.queryByRole('combobox')).not.toBeInTheDocument()

        await user.click(screen.getByRole('button', { name: 'Volver a la causa' }))
        expect(await screen.findByText('Detalle de la causa')).toBeInTheDocument()
    })

    it('un error del servidor sin campos se muestra en un aviso', async () => {
        server.use(
            http.post('*/cases/:caseId/procedural-acts', () =>
                HttpResponse.json(
                    errorBody('FORBIDDEN', 'Solo el abogado responsable de la causa puede registrar actos procesales.'),
                    { status: 403 },
                ),
            ),
        )
        const { user } = renderPage(1)

        await user.click(await screen.findByRole('combobox'))
        await user.click(screen.getByRole('option', { name: /Cédula de notificación/ }))
        await user.click(screen.getByRole('button', { name: 'Registrar acto' }))

        await waitFor(() =>
            expect(screen.getByRole('alert')).toHaveTextContent(
                'Solo el abogado responsable de la causa puede registrar actos procesales.',
            ),
        )
        expect(screen.queryByText('Detalle de la causa')).not.toBeInTheDocument()
    })

    /* CA-22.5 (HU-22): el acto se aplica a la causa en el momento (V3 D-13), y
       la mutación invalida las claves de la causa. Por eso el detalle, al que se
       vuelve después de guardar, ya muestra el estado y el plazo nuevos. Se
       monta el detalle de verdad, no un cartel: es lo que el criterio pide. */
    it('al volver al detalle, el estado y el vencimiento son los que dejó el acto', async () => {
        const { user } = renderWithProviders(<RegisterProceduralActPage />, {
            as: 'mrios',
            route: '/causas/1/acto',
            path: '/causas/:caseId/acto',
            routes: [{ path: '/causas/:caseId', element: <CaseDetailPage /> }],
        })

        // La causa 1 está en "Oposición al requerimiento de elevación", a un día hábil.
        await user.click(await screen.findByRole('combobox'))
        await user.click(screen.getByRole('option', { name: /Cédula de notificación/ }))
        await user.click(screen.getByRole('button', { name: 'Registrar acto' }))

        /* El encabezado se vuelve a montar cuando llega la causa de nuevo, así
           que se lo busca otra vez: una referencia vieja queda desconectada
           (TESTING.md §9). */
        await screen.findByRole('region', { name: 'Causa 13284571' })
        await waitFor(() =>
            expect(screen.getByRole('region', { name: 'Causa 13284571' })).toHaveTextContent(
                'Cédula de notificación',
            ),
        )

        const header = screen.getByRole('region', { name: 'Causa 13284571' })
        expect(header).not.toHaveTextContent('Oposición al requerimiento de elevación')
        // El plazo que abrió el acto: vence el viernes 18/09, a 3 días hábiles.
        expect(within(header).getByText('En 3 días hábiles')).toBeInTheDocument()
    })
})
