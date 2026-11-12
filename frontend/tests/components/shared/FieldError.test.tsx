import { describe, expect, it } from 'vitest'
import { render, screen } from '@testing-library/react'
import { Field, FieldError, TextInput } from '@/shared/components/forms'
import { splitErrorMessage } from '@/shared/lib/splitErrorMessage'

/**
 * El backend junta en un texto todos los mensajes que fallan sobre un campo.
 * `FieldError` los pinta uno por línea, con el ícono de alerta.
 */
describe('splitErrorMessage', () => {
    it('corta en cada oración', () => {
        expect(splitErrorMessage('Debe tener al menos 8 caracteres. Debe incluir al menos un número.')).toEqual([
            'Debe tener al menos 8 caracteres.',
            'Debe incluir al menos un número.',
        ])
    })

    it.each([
        'Ya existe una calificación "Hurto simple — art. 162 CP".',
        'El formato es circunscripción y número: 1-28114.',
        'Puede tener hasta 255 caracteres.',
    ])('no parte un mensaje de una oración: %s', (message) => {
        expect(splitErrorMessage(message)).toEqual([message])
    })

    it('un mensaje vacío no da líneas', () => {
        expect(splitErrorMessage('  ')).toEqual([])
    })
})

describe('FieldError', () => {
    it('pone cada oración en su renglón, con un solo ícono', () => {
        const { container } = render(
            <FieldError message="Debe tener al menos 8 caracteres. Debe incluir al menos un número." />,
        )

        const error = container.querySelector('.vz-error') as HTMLElement
        expect(error.textContent).toBe('Debe tener al menos 8 caracteres.\nDebe incluir al menos un número.')
        expect(error.querySelectorAll('svg')).toHaveLength(1)
        // Se sigue encontrando por el mensaje entero, como llega del servidor.
        expect(screen.getByText('Debe tener al menos 8 caracteres. Debe incluir al menos un número.')).toBe(error)
    })

    it('lleva el id para el aria-describedby', () => {
        render(<FieldError id="fecha-error" message="La fecha es obligatoria." />)

        expect(screen.getByText('La fecha es obligatoria.')).toHaveAttribute('id', 'fecha-error')
    })

    it('en un Field, el error se encuentra por su texto y oculta la nota', () => {
        render(
            <Field label="Contraseña" note="Mínimo 8 caracteres." error="La contraseña es obligatoria." htmlFor="p">
                <TextInput id="p" />
            </Field>,
        )

        expect(screen.getByText('La contraseña es obligatoria.', { selector: '.vz-error' })).toBeInTheDocument()
        expect(screen.queryByText('Mínimo 8 caracteres.')).not.toBeInTheDocument()
        expect(screen.getByLabelText('Contraseña').closest('.vz-field')).toHaveClass('vz-field--error')
    })
})
