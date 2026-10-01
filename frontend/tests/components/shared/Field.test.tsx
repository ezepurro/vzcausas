import { describe, expect, it } from 'vitest'
import { render, screen } from '@testing-library/react'
import { Field, Textarea, TextInput } from '@/shared/components/forms'
import { DetailList } from '@/shared/components/ui'

describe('Field', () => {
    it('enlaza la etiqueta con el control y marca el obligatorio', () => {
        render(
            <Field label="Carátula" required htmlFor="caption">
                <TextInput id="caption" />
            </Field>,
        )

        expect(screen.getByLabelText(/^Carátula/)).toBeInTheDocument()
        expect(screen.getByText(/^Carátula/).textContent).toBe('Carátula*')
    })

    it('muestra la nota, y el error la reemplaza', () => {
        const { rerender } = render(
            <Field label="N° de SAC" note="Identifica la causa de forma única.">
                <TextInput />
            </Field>,
        )
        expect(screen.getByText('Identifica la causa de forma única.')).toBeInTheDocument()

        rerender(
            <Field label="N° de SAC" note="Identifica la causa de forma única." error="El SAC tiene 8 dígitos.">
                <TextInput />
            </Field>,
        )
        expect(screen.getByText('El SAC tiene 8 dígitos.')).toBeInTheDocument()
        expect(screen.queryByText('Identifica la causa de forma única.')).not.toBeInTheDocument()
    })

    it('con `hint` muestra un dato a la derecha de la etiqueta, sin romper el enlace con el control', () => {
        render(
            <Field label="Objeto del amparo" htmlFor="subject" hint="23 / 800">
                <Textarea id="subject" />
            </Field>,
        )

        expect(screen.getByText('23 / 800')).toBeInTheDocument()
        expect(screen.getByLabelText('Objeto del amparo')).toBe(screen.getByRole('textbox'))
    })

    it('sin `hint` no agrega el renglón de la etiqueta', () => {
        const { container } = render(
            <Field label="Carátula">
                <TextInput />
            </Field>,
        )

        expect(container.querySelector('.vz-label-row')).toBeNull()
    })
})

describe('DetailList', () => {
    it('muestra cada dato con su etiqueta, y una raya si falta', () => {
        render(
            <DetailList
                items={[
                    { label: 'DNI', value: '34.812.905', mono: true },
                    { label: 'Correo', value: null },
                    { label: 'Causas', value: 0 },
                ]}
            />,
        )

        expect(screen.getByText('DNI').closest('.vz-details__row')).toHaveTextContent('34.812.905')
        expect(screen.getByText('Correo').closest('.vz-details__row')).toHaveTextContent('—')
        // El cero es un dato, no una ausencia.
        expect(screen.getByText('Causas').closest('.vz-details__row')).toHaveTextContent('0')
    })

    it('con `note` agrega una aclaración debajo de la etiqueta', () => {
        render(
            <DetailList
                items={[{ label: 'Robo calificado', note: '8 años desde el 27/02/2021', value: '27/02/2029' }]}
            />,
        )

        const term = screen.getByRole('term')
        expect(term).toHaveTextContent('Robo calificado')
        expect(term).toHaveTextContent('8 años desde el 27/02/2021')
        expect(screen.getByRole('definition')).toHaveTextContent('27/02/2029')
    })
})
