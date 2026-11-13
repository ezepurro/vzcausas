import { useState } from 'react'
import { describe, expect, it } from 'vitest'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { FormModal, type FieldSpec, type FormValues } from '@/shared/components/forms'

/**
 * `maxLength` de un `FieldSpec`: el control no deja escribir de más, y en un
 * 'area' se dibuja el contador. El `Harness` hace de pantalla y guarda los
 * valores.
 */
function Harness({ fields }: { fields: FieldSpec[] }) {
    const [values, setValues] = useState<FormValues>({ name: '', notes: '' })
    return (
        <FormModal
            title="Prueba"
            fields={fields}
            values={values}
            onChange={(k, v) => setValues((s) => ({ ...s, [k]: v }))}
            onConfirm={() => {}}
            onCancel={() => {}}
        />
    )
}

describe('FormModal · maxLength', () => {
    it('un texto no deja escribir más del tope', async () => {
        const user = userEvent.setup()
        render(<Harness fields={[{ k: 'name', label: 'Nombre', maxLength: 5 }]} />)

        await user.type(screen.getByLabelText('Nombre'), 'abcdefgh')

        expect(screen.getByLabelText('Nombre')).toHaveValue('abcde')
    })

    it('un área corta en el tope y muestra el contador', async () => {
        const user = userEvent.setup()
        render(<Harness fields={[{ k: 'notes', label: 'Observaciones', type: 'area', maxLength: 10 }]} />)

        expect(screen.getByText('0 / 10')).toBeInTheDocument()
        await user.type(screen.getByLabelText('Observaciones'), 'una nota muy larga')

        expect(screen.getByLabelText('Observaciones')).toHaveValue('una nota m')
        expect(screen.getByText('10 / 10')).toBeInTheDocument()
    })

    it('sin tope, no hay contador ni atributo', () => {
        render(<Harness fields={[{ k: 'notes', label: 'Observaciones', type: 'area' }]} />)

        expect(screen.getByLabelText('Observaciones')).not.toHaveAttribute('maxlength')
        expect(screen.queryByText(/\/ \d+$/)).not.toBeInTheDocument()
    })
})

/**
 * Lo que un lector de pantalla necesita de cada campo (H-35): que el error
 * esté unido al control, que lo obligatorio se anuncie como obligatorio y no
 * como "asterisco", y que la ayuda del campo se lea con él.
 */
describe('FormModal · accesibilidad de los campos', () => {
    it('un campo con error queda marcado y unido a su mensaje', () => {
        render(<Harness fields={[{ k: 'name', label: 'Nombre', error: 'El nombre es obligatorio.' }]} />)

        const input = screen.getByLabelText('Nombre')

        expect(input).toHaveAttribute('aria-invalid', 'true')
        expect(input).toHaveAccessibleDescription('El nombre es obligatorio.')
    })

    it('sin error no queda marcado, y la ayuda del campo es su descripción', () => {
        render(<Harness fields={[{ k: 'name', label: 'Nombre', note: 'Sin puntos.' }]} />)

        const input = screen.getByLabelText('Nombre')

        expect(input).not.toHaveAttribute('aria-invalid')
        expect(input).toHaveAccessibleDescription('Sin puntos.')
    })

    it('lo obligatorio se anuncia en el control; el asterisco no es parte del nombre', () => {
        render(
            <Harness
                fields={[
                    { k: 'name', label: 'Nombre', required: true },
                    { k: 'notes', label: 'Observaciones', type: 'area' },
                ]}
            />,
        )

        expect(screen.getByRole('textbox', { name: 'Nombre' })).toBeRequired()
        expect(screen.getByRole('textbox', { name: 'Observaciones' })).not.toBeRequired()
    })

    it('un desplegable y un área también quedan unidos a su error', () => {
        render(
            <Harness
                fields={[
                    { k: 'name', label: 'Tipo', type: 'select', options: ['A', 'B'], error: 'Elegí un tipo.' },
                    { k: 'notes', label: 'Observaciones', type: 'area', error: 'Son obligatorias.' },
                ]}
            />,
        )

        expect(screen.getByLabelText('Tipo')).toHaveAccessibleDescription('Elegí un tipo.')
        expect(screen.getByLabelText('Observaciones')).toHaveAttribute('aria-invalid', 'true')
    })
})

/**
 * `autoComplete` y el tipo `'email'` (H-37): que el navegador no ofrezca la
 * contraseña de quien está logueado al cargar la de otra persona, y que el
 * teléfono muestre el teclado con arroba.
 */
describe('FormModal · autocompletado y correo', () => {
    it('pasa `autoComplete` al control', () => {
        render(<Harness fields={[{ k: 'name', label: 'Contraseña inicial', type: 'pass', autoComplete: 'new-password' }]} />)

        expect(screen.getByLabelText('Contraseña inicial')).toHaveAttribute('autocomplete', 'new-password')
    })

    it("un campo 'email' es un control de correo", () => {
        render(<Harness fields={[{ k: 'name', label: 'Correo electrónico', type: 'email' }]} />)

        expect(screen.getByLabelText('Correo electrónico')).toHaveAttribute('type', 'email')
    })
})
