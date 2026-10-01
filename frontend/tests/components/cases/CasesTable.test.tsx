import { describe, expect, it, vi } from 'vitest'
import { render, screen, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { CasesTable } from '@/features/cases/components/CasesTable'
import { CaseHeader } from '@/features/cases/components/CaseHeader'
import type { Case } from '@/features/cases/types/case'

/** La causa del prototipo, con estado y plazo abierto. */
const WITH_STATE: Case = {
    id: 1,
    sacNumber: '13284571',
    caption: 'GÓMEZ, Ariel Fernando p.s.a. Robo calificado',
    court: 'Juzgado de Control N° 3 · Córdoba',
    jurisdiction: 'CRIMINAL',
    proceduralRole: 'DEFENSE',
    instructorName: 'Dra. Verónica Ledesma',
    instructorPhone: '0351 448-1200 int. 214',
    counterparty: null,
    subjectMatter: null,
    client: {
        id: 1,
        lastName: 'GÓMEZ',
        firstName: 'Ariel Fernando',
        dni: '34812905',
        phone: '351 415-2288',
        email: 'afgomez@gmail.com',
        clientSince: '2021-03-12',
    },
    responsibleLawyer: { id: 3, fullName: 'Dra. Malena Ríos', registrationNumber: '1-36842' },
    legalQualifications: [
        {
            id: 1,
            name: 'Robo calificado — art. 167 inc. 2 CP',
            prescriptionMonths: 96,
            offenseDate: '2021-02-27',
            prescriptionStartsOn: '2021-02-27',
            prescriptionExpiresOn: '2029-02-27',
        },
    ],
    startDate: '2021-03-12',
    currentState: { proceduralStateId: 4, name: 'Oposición al requerimiento de elevación', custom: false },
    nextDeadline: { proceduralActId: 3, dueDate: '2026-09-16', businessDaysRemaining: 1, manuallyAdjusted: false },
    active: true,
}

/** Una causa recién registrada: sin estado procesal ni plazo (V3 D-09). */
const WITHOUT_ACTS: Case = {
    ...WITH_STATE,
    id: 7,
    sacNumber: '14118903',
    caption: 'BENÍTEZ, Rodrigo E. p.s.a. Lesiones graves',
    currentState: null,
    nextDeadline: null,
}

describe('CasesTable', () => {
    it('muestra las columnas del prototipo', () => {
        render(<CasesTable rows={[WITH_STATE]} onOpen={vi.fn()} />)

        const headers = screen.getAllByRole('columnheader').map((th) => th.textContent)
        expect(headers).toEqual(['N° SAC', 'Carátula', 'Fuero', 'Estado procesal', 'Responsable', 'Próximo vencimiento', ''])
    })

    it('muestra el estado y el vencimiento de la causa', () => {
        render(<CasesTable rows={[WITH_STATE]} onOpen={vi.fn()} />)

        const row = screen.getAllByRole('row')[1]
        expect(within(row).getByText('Oposición al requerimiento de elevación')).toBeInTheDocument()
        expect(within(row).getByText('En 1 día hábil')).toBeInTheDocument()
        expect(within(row).getByText('16/09/2026')).toBeInTheDocument()
        expect(within(row).getByText('Penal')).toBeInTheDocument()
    })

    it('una causa sin actos se muestra "Sin acto procesal" y sin plazo abierto', () => {
        render(<CasesTable rows={[WITHOUT_ACTS]} onOpen={vi.fn()} />)

        const row = screen.getAllByRole('row')[1]
        expect(within(row).getByText('Sin acto procesal')).toBeInTheDocument()
        expect(within(row).getByText('Sin plazo abierto')).toBeInTheDocument()
    })

    it('"Ver detalle" avisa qué causa abrir', async () => {
        const onOpen = vi.fn()
        render(<CasesTable rows={[WITH_STATE, WITHOUT_ACTS]} onOpen={onOpen} />)

        await userEvent.setup().click(screen.getAllByRole('button', { name: 'Ver detalle' })[1])

        expect(onOpen).toHaveBeenCalledWith(WITHOUT_ACTS)
    })

    it('sin filas muestra el estado vacío que recibe', () => {
        render(<CasesTable rows={[]} onOpen={vi.fn()} empty={<p>Ninguna causa coincide con los filtros.</p>} />)

        expect(screen.getByText('Ninguna causa coincide con los filtros.')).toBeInTheDocument()
    })
})

describe('CaseHeader', () => {
    it('muestra el SAC, la carátula y el estado procesal actual', () => {
        render(<CaseHeader case={WITH_STATE} />)

        const header = screen.getByRole('region', { name: 'Causa 13284571' })
        expect(within(header).getByRole('heading', { level: 1 })).toHaveTextContent(WITH_STATE.caption)
        expect(header).toHaveTextContent('Estado procesal actual')
        expect(header).toHaveTextContent('Oposición al requerimiento de elevación')
        expect(header).toHaveTextContent('Rol Defensa')
    })

    it('una causa sin actos muestra "Sin acto procesal"', () => {
        render(<CaseHeader case={WITHOUT_ACTS} />)

        expect(screen.getByRole('region', { name: 'Causa 14118903' })).toHaveTextContent('Sin acto procesal')
    })

    it('el instructor se muestra sólo si la pantalla lo pide', () => {
        const { rerender } = render(<CaseHeader case={WITH_STATE} />)
        expect(screen.queryByText('Dra. Verónica Ledesma')).not.toBeInTheDocument()

        rerender(<CaseHeader case={WITH_STATE} showInstructor />)
        expect(screen.getByText('Dra. Verónica Ledesma')).toBeInTheDocument()
    })
})
