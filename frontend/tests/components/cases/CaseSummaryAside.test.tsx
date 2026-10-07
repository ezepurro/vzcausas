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
                { label: 'Fecha del hecho en cada calificación legal', done: false },
            ]}
            {...props}
        />,
    )
    return { onUseCaption, user: userEvent.setup() }
}

/** El renglón del resumen que tiene esa etiqueta. */
const rowOf = (label: string) => screen.getByText(label).closest('.vz-details__row') as HTMLElement

describe('CaseSummaryAside', () => {
    /* CA-18.7: la causa nace en el estado inicial de su fuero, "Iniciada", y el
       estado de la tabla lo fija el primer acto procesal (V3 D-34). */
    it('la causa nace en "Iniciada": el estado de la tabla lo fija el primer acto', () => {
        renderAside()

        const row = rowOf('Estado inicial')
        expect(row).toHaveTextContent('Iniciada')
        expect(row).toHaveTextContent('El estado lo fija el primer acto procesal')
        expect(row).not.toHaveTextContent('Sin acto procesal')
    })

    /* CA-18.6: la fecha del hecho más los meses de esa calificación. */
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

    /* CA-18.6: cada calificación computa la suya, desde su propia fecha. */
    it('con varias calificaciones, cada una tiene su propio vencimiento', () => {
        renderAside({
            prescriptions: [
                { name: 'Lesiones graves', term: '6 años', offenseDate: '2026-08-30', expiresOn: '2032-08-30' },
                { name: 'Amenazas coactivas', term: '2 años', offenseDate: '2026-09-02', expiresOn: '2028-09-02' },
            ],
        })

        expect(rowOf('Lesiones graves')).toHaveTextContent('30/08/2032')
        expect(rowOf('Amenazas coactivas')).toHaveTextContent('02/09/2028')
    })

    it('sin la fecha del hecho avisa que falta y no inventa un vencimiento', () => {
        renderAside({
            prescriptions: [{ name: 'Abuso de armas', term: '6 años y 6 meses', offenseDate: '', expiresOn: null }],
        })

        const row = rowOf('Abuso de armas')
        expect(row).toHaveTextContent('6 años y 6 meses · falta la fecha del hecho')
        expect(row).toHaveTextContent('—')
    })

    /* CA-18.5: una causa penal sin calificaciones no computa prescripción. */
    it('en el penal sin calificaciones dice que todavía falta la calificación', () => {
        renderAside({ prescriptions: [] })

        expect(rowOf('Prescripción')).toHaveTextContent('Falta la calificación legal')
    })

    /* CA-18.4: fuera del penal no hay prescripción que computar. */
    it('fuera del penal la prescripción no aplica', () => {
        renderAside({ prescriptions: null, jurisdictionLabel: 'Amparo' })

        expect(rowOf('Prescripción')).toHaveTextContent('No aplica al fuero Amparo')
    })

    describe('carátula sugerida (CA-18.11)', () => {
        it('muestra la sugerencia y ofrece usarla', async () => {
            const { user, onUseCaption } = renderAside()

            expect(screen.getByText('GÓMEZ, Ariel Fernando p.s.a. Robo calificado')).toBeInTheDocument()
            await user.click(screen.getByRole('button', { name: 'Usar esta carátula' }))

            expect(onUseCaption).toHaveBeenCalledTimes(1)
        })

        it('sin cliente no hay carátula que sugerir', () => {
            renderAside({ suggestedCaption: null })

            expect(screen.getByText('Elegí el cliente para sugerir la carátula.')).toBeInTheDocument()
            expect(screen.getByRole('button', { name: 'Usar esta carátula' })).toBeDisabled()
        })

        it('si la carátula ya es la sugerida, no hay nada que copiar', () => {
            renderAside({ captionIsSuggested: true })

            expect(screen.getByRole('button', { name: 'Usar esta carátula' })).toBeDisabled()
        })
    })

    describe('"Para poder registrar"', () => {
        it('dice qué está listo y qué falta', () => {
            renderAside()

            const items = screen.getAllByRole('listitem')
            expect(items[0]).toHaveTextContent('Cliente seleccionado (listo)')
            expect(items[1]).toHaveTextContent('Fecha del hecho en cada calificación legal (falta)')
        })

        /* Los rótulos cambian según el caso, como en el prototipo. */
        it.each([
            'N° de SAC: opcional',
            'N° de SAC válido y no repetido',
            'Calificaciones legales: opcionales',
            'Fecha del hecho en cada calificación legal',
            'Calificación legal: no aplica a este fuero',
            'Objeto del amparo redactado',
            'Objeto del reclamo redactado',
            'Carátula cargada',
            'Abogado responsable asignado',
        ])('muestra el requisito "%s" tal como se lo pasa la pantalla', (label) => {
            renderAside({ checklist: [{ label, done: false }] })

            expect(screen.getByRole('listitem')).toHaveTextContent(label)
        })
    })
})
