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

/* H-05 de `docs/auditoria-front`: un clic afuera cerraba el formulario y se
   perdía lo escrito. Con campos ya no; una confirmación sin campos, sí. */
describe('FormModal · clic en el fondo', () => {
    const backdrop = () => document.querySelector('.vz-modal-backdrop') as HTMLElement

    function renderForm(fields: FieldSpec[]) {
        let cancelled = 0
        render(
            <FormModal
                title="Registrar cliente"
                fields={fields}
                values={{ name: 'Gómez' }}
                onChange={() => {}}
                onConfirm={() => {}}
                onCancel={() => { cancelled += 1 }}
            />,
        )
        return { cancelled: () => cancelled, user: userEvent.setup() }
    }

    it('con campos no se cierra', async () => {
        const { cancelled, user } = renderForm([{ k: 'name', label: 'Nombre' }])

        await user.click(backdrop())

        expect(cancelled()).toBe(0)
    })

    it('con campos, "Cancelar" y la "×" sí cierran', async () => {
        const { cancelled, user } = renderForm([{ k: 'name', label: 'Nombre' }])

        await user.click(screen.getByRole('button', { name: 'Cancelar' }))
        await user.click(screen.getByRole('button', { name: 'Cerrar' }))

        expect(cancelled()).toBe(2)
    })

    it('una confirmación sin campos se cierra con un clic afuera', async () => {
        const { cancelled, user } = renderForm([])

        await user.click(backdrop())

        expect(cancelled()).toBe(1)
    })
})
