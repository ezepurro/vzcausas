import { screen } from '@testing-library/react'
import type { UserEvent } from '@testing-library/user-event'

/**
 * Elige una opción de un `SearchSelect` como lo hace una persona: abre la
 * lista y hace clic en la opción. Espera a que la opción llegue, porque las
 * opciones vienen del servidor.
 */
export async function chooseOption(user: UserEvent, field: HTMLElement, name: string | RegExp): Promise<void> {
    await user.click(field)
    await user.click(await screen.findByRole('option', { name }))
}
