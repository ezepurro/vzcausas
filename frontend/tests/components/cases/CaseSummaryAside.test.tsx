import { describe, expect, it, vi } from 'vitest'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { CaseSummaryAside, type CaseSummaryAsideProps } from '@/features/cases/components/CaseSummaryAside'

function renderAside(props: Partial<CaseSummaryAsideProps> = {}) {
    const onUseCaption = vi.fn()
    render(
        <CaseSummaryAside
            suggestedCaption="GÓMEZ, Ariel Fernando p.s.a. Robo calificado"
            onUseCaption={onUseCaption}
            captionIsSuggested={false}
            prescriptions={[]}
            jurisdictionLabel="Penal"
            checklist={[
                { label: 'Cliente seleccionado', done: true },
                { label: 'Fecha del hecho de cada calificación', done: false },
            ]}
            {...props}
        />,
    )
    return { onUseCaption, user: userEvent.setup() }
}

/** El renglón del resumen que tiene esa etiqueta. */
const rowOf = (label: string) => screen.getByText(label).closest('.vz-details__row') as HTMLElement

describe('CaseSummaryAside', () => {
    it('la causa nace sin estado: lo fija el primer acto procesal (D-09)', () => {
        renderAside()

        const row = rowOf('Estado inicial')
        expect(row).toHaveTextContent('Sin acto procesal')
        expect(row).toHaveTextContent('El estado lo fija el primer acto procesal')
    })

    it('cada calificación muestra desde cuándo corre y cuándo prescribe', () => {
        renderAside({
            prescriptions: [
                { name: 'Robo calificado', term: '8 años', offenseDate: '2021-02-27', expiresOn: '2029-02-27' },
            ],
        })

        const row = rowOf('Robo calificado')
        expect(row).toHaveTextContent('8 años desde el 27/02/2021')
        expect(row).toHaveTextContent('27/02/2029')
        expect(screen.queryByText('Prescripción')).not.toBeInTheDocument()
    })

    it('sin la fecha del hecho avisa que falta y no inventa un vencimiento', () => {
        renderAside({
            prescriptions: [{ name: 'Abuso de armas', term: '6 años y 6 meses', offenseDate: '', expiresOn: null }],
        })

        const row = rowOf('Abuso de armas')
        expect(row).toHaveTextContent('6 años y 6 meses · falta la fecha del hecho')
        expect(row).toHaveTextContent('—')
    })

    it('en el penal sin calificaciones dice qué falta', () => {
        renderAside({ prescriptions: [] })

        expect(rowOf('Prescripción')).toHaveTextContent('Falta la calificación legal')
    })

    it('fuera del penal la prescripción no aplica', () => {
        renderAside({ prescriptions: null, jurisdictionLabel: 'Amparo' })

        expect(rowOf('Prescripción')).toHaveTextContent('No aplica al fuero Amparo')
    })

    it('"Usar esta carátula" avisa a la pantalla', async () => {
        const { user, onUseCaption } = renderAside()

        await user.click(screen.getByRole('button', { name: 'Usar esta carátula' }))

        expect(onUseCaption).toHaveBeenCalledTimes(1)
    })

    it('sin cliente no hay carátula que sugerir', () => {
        renderAside({ suggestedCaption: null })

        expect(screen.getByText('Elegí el cliente para sugerir la carátula.')).toBeInTheDocument()
        expect(screen.getByRole('button', { name: 'Usar esta carátula' })).toBeDisabled()
    })

    it('la lista de requisitos dice qué está listo y qué falta', () => {
        renderAside()

        const items = screen.getAllByRole('listitem')
        expect(items[0]).toHaveTextContent('Cliente seleccionado (listo)')
        expect(items[1]).toHaveTextContent('Fecha del hecho de cada calificación (falta)')
    })
})
