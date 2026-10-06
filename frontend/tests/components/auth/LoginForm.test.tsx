import { describe, expect, it, vi } from 'vitest'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { LoginForm, type LoginFormProps } from '@/features/auth/components/LoginForm'

/**
 * `LoginForm` es presentacional: no valida ni llama al servidor. Por eso acá
 * alcanza con `render` a secas y funciones espía; el comportamiento completo
 * (validar, llamar a la API, navegar) se prueba en `LoginPage.test.tsx`.
 */
function renderForm(props: Partial<LoginFormProps> = {}) {
    const handlers = { onChange: vi.fn(), onSubmit: vi.fn() }
    render(
        <LoginForm
            values={{ username: '', password: '' }}
            errors={{}}
            banner={null}
            submitting={false}
            {...handlers}
            {...props}
        />,
    )
    return { ...handlers, user: userEvent.setup() }
}

describe('LoginForm', () => {
    it('muestra los dos campos y el botón de ingresar', () => {
        renderForm()

        expect(screen.getByLabelText('Usuario')).toBeInTheDocument()
        expect(screen.getByLabelText('Contraseña')).toHaveAttribute('type', 'password')
        expect(screen.getByRole('button', { name: 'Ingresar' })).toBeEnabled()
    })

    it('el ojo muestra y oculta la contraseña', async () => {
        const { user } = renderForm({ values: { username: 'fvazquez', password: 'password1' } })

        await user.click(screen.getByRole('button', { name: 'Mostrar contraseña' }))
        expect(screen.getByLabelText('Contraseña')).toHaveAttribute('type', 'text')

        await user.click(screen.getByRole('button', { name: 'Ocultar contraseña' }))
        expect(screen.getByLabelText('Contraseña')).toHaveAttribute('type', 'password')
    })

    it('avisa cada tecla con el campo que cambió', async () => {
        const { user, onChange } = renderForm()

        await user.type(screen.getByLabelText('Usuario'), 'f')

        expect(onChange).toHaveBeenCalledWith('username', 'f')
    })

    it('enviar el formulario llama a onSubmit (también con Enter)', async () => {
        const { user, onSubmit } = renderForm({ values: { username: 'fvazquez', password: 'x' } })

        await user.click(screen.getByLabelText('Contraseña'))
        await user.keyboard('{Enter}')

        expect(onSubmit).toHaveBeenCalledTimes(1)
    })

    it('muestra los errores de cada campo', () => {
        renderForm({ errors: { username: 'El nombre de usuario es obligatorio.' } })

        expect(screen.getByText('El nombre de usuario es obligatorio.')).toBeInTheDocument()
    })

    it('muestra el aviso general como alerta', () => {
        renderForm({ banner: 'Credenciales inválidas.' })

        expect(screen.getByRole('alert')).toHaveTextContent('Credenciales inválidas.')
    })

    it('mientras envía, bloquea los campos y el botón', () => {
        renderForm({ submitting: true })

        expect(screen.getByRole('button', { name: 'Ingresando…' })).toBeDisabled()
        expect(screen.getByLabelText('Usuario')).toBeDisabled()
        expect(screen.getByLabelText('Contraseña')).toBeDisabled()
    })
})
