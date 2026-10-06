import { describe, expect, it, vi } from 'vitest'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { Field, PasswordInput } from '@/shared/components/forms'

function renderInput(props: { disabled?: boolean; onChange?: () => void } = {}) {
    render(
        <Field label="Contraseña" htmlFor="pwd">
            <PasswordInput id="pwd" value="secreta1" onChange={props.onChange ?? vi.fn()} disabled={props.disabled} />
        </Field>,
    )
    return userEvent.setup()
}

describe('PasswordInput', () => {
    it('arranca oculta', () => {
        renderInput()

        expect(screen.getByLabelText('Contraseña')).toHaveAttribute('type', 'password')
        expect(screen.getByRole('button', { name: 'Mostrar contraseña' })).toBeInTheDocument()
    })

    it('el ojo la muestra y la vuelve a ocultar', async () => {
        const user = renderInput()

        await user.click(screen.getByRole('button', { name: 'Mostrar contraseña' }))
        expect(screen.getByLabelText('Contraseña')).toHaveAttribute('type', 'text')

        await user.click(screen.getByRole('button', { name: 'Ocultar contraseña' }))
        expect(screen.getByLabelText('Contraseña')).toHaveAttribute('type', 'password')
    })

    it('el ojo no cambia el valor ni avisa un cambio', async () => {
        const onChange = vi.fn()
        const user = renderInput({ onChange })

        await user.click(screen.getByRole('button', { name: 'Mostrar contraseña' }))

        expect(screen.getByLabelText('Contraseña')).toHaveValue('secreta1')
        expect(onChange).not.toHaveBeenCalled()
    })

    it('deshabilitado, el ojo también', () => {
        renderInput({ disabled: true })

        expect(screen.getByLabelText('Contraseña')).toBeDisabled()
        expect(screen.getByRole('button', { name: 'Mostrar contraseña' })).toBeDisabled()
    })

    it('el ojo no envía el formulario', async () => {
        const onSubmit = vi.fn((e: { preventDefault: () => void }) => e.preventDefault())
        render(
            <form onSubmit={onSubmit}>
                <PasswordInput aria-label="Contraseña" value="" onChange={vi.fn()} />
            </form>,
        )

        await userEvent.setup().click(screen.getByRole('button', { name: 'Mostrar contraseña' }))

        expect(onSubmit).not.toHaveBeenCalled()
    })
})
