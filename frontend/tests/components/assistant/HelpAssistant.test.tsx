import { beforeEach, describe, expect, it } from 'vitest'
import { screen, waitFor, within } from '@testing-library/react'

import { renderWithProviders, waitForSession } from '../../setup/render'
import { server } from '@/shared/mocks/server'
import { assistantDemoErrors, assistantDemoHandlers } from '@/shared/mocks/assistant.demo'
import { HelpAssistant } from '@/features/assistant/components/HelpAssistant'

/*
 * Demo del asistente de ayuda (features/assistant/CAMBIOS.md). El mock va
 * fuera de `ROUTES` (no está en el contrato), así que cada test lo enchufa.
 * Se prueba el componente entero, botón y panel, como lo usa la persona: no
 * hay página propia, vive en la barra superior.
 */

async function openPanel() {
    const view = renderWithProviders(<HelpAssistant />, { as: 'mrios' })
    await waitForSession()
    await view.user.click(screen.getByRole('button', { name: 'Asistente' }))
    return view
}

const panel = () => screen.getByRole('complementary', { name: 'Asistente de ayuda' })

describe('HelpAssistant', () => {
    beforeEach(() => {
        server.use(...assistantDemoHandlers)
    })

    it('el botón Asistente abre el panel con el aviso de demo y el foco en la pregunta', async () => {
        await openPanel()

        expect(screen.getByRole('button', { name: 'Asistente' })).toHaveAttribute('aria-expanded', 'true')
        expect(within(panel()).getByText(/No escribas datos de causas ni de clientes/)).toBeInTheDocument()
        expect(screen.getByLabelText(/Tu pregunta/)).toHaveFocus()
    })

    it('pregunta y muestra la respuesta con las secciones del manual', async () => {
        const { user } = await openPanel()

        await user.type(screen.getByLabelText(/Tu pregunta/), '¿Cómo registro una causa sin SAC?')
        await user.click(screen.getByRole('button', { name: 'Enviar' }))

        const log = within(screen.getByRole('list', { name: 'Conversación' }))
        expect(log.getByText('¿Cómo registro una causa sin SAC?')).toBeInTheDocument()
        expect(await log.findByText(/El número de SAC es opcional/)).toBeInTheDocument()
        expect(log.getByRole('list', { name: 'Secciones del manual' })).toHaveTextContent('Registrar una causa')
        // El campo queda vacío para la siguiente pregunta.
        expect(screen.getByLabelText(/Tu pregunta/)).toHaveValue('')
    })

    it('sin pregunta avisa en el campo y no pide nada', async () => {
        const { user } = await openPanel()

        await user.click(screen.getByRole('button', { name: 'Enviar' }))

        expect(screen.getByText('Escribí tu pregunta.')).toBeInTheDocument()
        expect(screen.getByLabelText(/Tu pregunta/)).toHaveAttribute('aria-invalid', 'true')
        expect(within(screen.getByRole('list', { name: 'Conversación' })).queryAllByRole('listitem')).toHaveLength(1)
    })

    it.each([
        ['502', () => assistantDemoErrors.unavailable(), 'El asistente no está disponible en este momento. Intentá de nuevo en unos minutos.'],
        ['429', () => assistantDemoErrors.tooManyRequests(35), 'Hiciste muchas preguntas seguidas. Probá de nuevo en 35 segundos.'],
    ])('con %s muestra el aviso que corresponde', async (_status, handler, message) => {
        server.use(handler())
        const { user } = await openPanel()

        await user.type(screen.getByLabelText(/Tu pregunta/), '¿Dónde están los plazos?')
        await user.click(screen.getByRole('button', { name: 'Enviar' }))

        expect(await screen.findByRole('alert')).toHaveTextContent(message)
    })

    it('Escape lo cierra, el foco vuelve al botón y la conversación se conserva', async () => {
        const { user } = await openPanel()
        await user.type(screen.getByLabelText(/Tu pregunta/), '¿Cómo cambio la contraseña?{Enter}')
        expect(await screen.findByText(/Cambiar contraseña/)).toBeInTheDocument()

        await user.keyboard('{Escape}')

        await waitFor(() => expect(screen.queryByRole('complementary')).not.toBeInTheDocument())
        expect(screen.getByRole('button', { name: 'Asistente' })).toHaveFocus()

        await user.click(screen.getByRole('button', { name: 'Asistente' }))
        expect(within(panel()).getByText('¿Cómo cambio la contraseña?')).toBeInTheDocument()
    })
})
