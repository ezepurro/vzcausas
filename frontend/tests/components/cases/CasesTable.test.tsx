import { describe, expect, it, vi } from 'vitest'
import { render, screen, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { CasesTable } from '@/features/cases/components/CasesTable'
import { CaseHeader } from '@/features/cases/components/CaseHeader'
import type { Case, CurrentState } from '@/features/cases/types/case'

/** El estado actual con su vencimiento: el plazo es parte del estado (V3 D-35). */
const STATE: CurrentState = {
    proceduralStateId: 4,
    name: 'Oposición al requerimiento de elevación',
    custom: false,
    initial: false,
    proceduralActId: 3,
    dueDate: '2026-09-16',
    businessDaysRemaining: 1,
    manuallyAdjusted: false,
}

/** El estado inicial de una causa recién registrada (V3 D-34). */
const INITIAL: CurrentState = {
    proceduralStateId: null,
    name: 'Iniciada',
    custom: false,
    initial: true,
    proceduralActId: null,
    dueDate: null,
    businessDaysRemaining: null,
    manuallyAdjusted: false,
}

/** La causa del prototipo, con estado y plazo abierto. */
const WITH_STATE: Case = {
    id: 1,
    sacNumber: '13284571',
    caption: 'GÓMEZ, Ariel Fernando p.s.a. Robo calificado',
    court: 'Juzgado de Control N° 3 · Córdoba',
    jurisdiction: 'CRIMINAL',
    proceduralRole: 'DEFENSE',
    instructorName: 'Dra. Verónica Ledesma',
    tribunalPhone: '0351 448-1200',
    instructorExtension: '214',
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
    currentState: STATE,
    active: true,
}

/** Una causa recién registrada: en "Iniciada" y sin plazo (V3 D-34). */
const WITHOUT_ACTS: Case = {
    ...WITH_STATE,
    id: 7,
    sacNumber: '14118903',
    caption: 'BENÍTEZ, Rodrigo E. p.s.a. Lesiones graves',
    currentState: INITIAL,
}

/** Una causa a la que el Poder Judicial todavía no le asignó el SAC (D-33). */
const WITHOUT_SAC: Case = {
    ...WITHOUT_ACTS,
    id: 23,
    sacNumber: null,
    caption: 'LEIVA, Gustavo A. — Actuaciones preliminares',
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

    /* CA-18.7: la causa nace en "Iniciada" y sin vencimiento. */
    it('una causa recién registrada se muestra "Iniciada" y sin plazo abierto', () => {
        render(<CasesTable rows={[WITHOUT_ACTS]} onOpen={vi.fn()} />)

        const row = screen.getAllByRole('row')[1]
        expect(within(row).getByText('Iniciada')).toBeInTheDocument()
        expect(within(row).getByText('Sin plazo abierto')).toBeInTheDocument()
    })

    /* CA-18.2: el SAC es opcional, así que la tabla tiene que poder no tenerlo. */
    it('una causa sin SAC se muestra como "Sin SAC"', () => {
        render(<CasesTable rows={[WITHOUT_SAC]} onOpen={vi.fn()} />)

        expect(within(screen.getAllByRole('row')[1]).getByText('Sin SAC')).toBeInTheDocument()
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

    /* Lo que sigue es de HU-20 (Consultar Causas). */

    /** La causa del prototipo, con otro vencimiento. */
    const withDeadline = (
        id: number,
        sacNumber: string,
        dueDate: string | null,
        businessDaysRemaining: number | null,
    ): Case => ({ ...WITH_STATE, id, sacNumber, currentState: { ...STATE, dueDate, businessDaysRemaining } })

    /* CA-20.1: el orden por urgencia lo resuelve el backend. Si la tabla
       reordenara, mezclaría las páginas. Estas tres no están ordenadas por SAC,
       por id ni por vencimiento, en ningún sentido. */
    it('muestra las causas en el orden en que las recibe, sin reordenarlas', () => {
        const rows = [
            withDeadline(2, '50000002', null, null),
            withDeadline(3, '10000003', '2026-09-18', 3),
            withDeadline(1, '90000001', '2026-09-11', -2),
        ]
        render(<CasesTable rows={rows} onOpen={vi.fn()} />)

        const sacs = screen.getAllByRole('row').slice(1).map((row) => within(row).getAllByRole('cell')[0].textContent)
        expect(sacs).toEqual(['50000002', '10000003', '90000001'])
    })

    /* CA-20.5: los días hábiles que restan, con la fecha del vencimiento. */
    it.each([
        [-2, '2026-09-11', 'Vencido hace 2 días', '11/09/2026'],
        [0, '2026-09-15', 'Vence hoy', '15/09/2026'],
        [3, '2026-09-18', 'En 3 días hábiles', '18/09/2026'],
        [10, '2026-09-29', 'En 10 días hábiles', '29/09/2026'],
    ])('con %i días hábiles restantes informa "%s" y la fecha', (days, dueDate, label, date) => {
        render(<CasesTable rows={[withDeadline(1, '13284571', dueDate, days)]} onOpen={vi.fn()} />)

        const row = screen.getAllByRole('row')[1]
        expect(within(row).getByText(label)).toBeInTheDocument()
        expect(within(row).getByText(date)).toBeInTheDocument()
    })

    /* CA-20.5: una vencida, una que vence hoy y una próxima no se ven igual. */
    it.each([
        ['una vencida', -2, 'Vencido hace 2 días', 'danger'],
        ['una que vence hoy', 0, 'Vence hoy', 'danger'],
        ['una que vence en los próximos días', 3, 'En 3 días hábiles', 'warn'],
        ['una que vence más adelante', 10, 'En 10 días hábiles', 'neutral'],
    ])('distingue %s por el color del chip', (_, days, label, tone) => {
        render(<CasesTable rows={[withDeadline(1, '13284571', '2026-09-15', days)]} onOpen={vi.fn()} />)

        expect(screen.getByText(label)).toHaveClass(`vz-pill--${tone}`)
    })

    /* CA-20.5: sin vencimiento no hay fecha que informar. */
    it('una causa sin vencimiento no muestra ninguna fecha', () => {
        render(<CasesTable rows={[withDeadline(1, '13284571', null, null)]} onOpen={vi.fn()} />)

        const row = screen.getAllByRole('row')[1]
        expect(within(row).getByText('Sin plazo abierto')).toBeInTheDocument()
        expect(within(row).queryByText(/\d{2}\/\d{2}\/\d{4}/)).not.toBeInTheDocument()
    })
})

describe('CaseHeader', () => {
    /* CA-22.1 */
    it('muestra la carátula, el SAC, el fuero, el tribunal, el rol y el responsable', () => {
        render(<CaseHeader case={WITH_STATE} />)

        const header = screen.getByRole('region', { name: 'Causa 13284571' })
        expect(within(header).getByRole('heading', { level: 1 })).toHaveTextContent(WITH_STATE.caption)
        expect(header).toHaveTextContent('SAC 13284571')
        expect(header).toHaveTextContent('Juzgado de Control N° 3 · Córdoba')
        expect(header).toHaveTextContent('Fuero Penal')
        expect(header).toHaveTextContent('Rol Defensa')
        expect(header).toHaveTextContent('Responsable Dra. Malena Ríos')
    })

    /* CA-22.1: el estado procesal actual y el vencimiento vigente. */
    it('muestra el estado procesal actual con su vencimiento', () => {
        render(<CaseHeader case={WITH_STATE} />)

        const header = screen.getByRole('region', { name: 'Causa 13284571' })
        expect(header).toHaveTextContent('Estado procesal actual')
        expect(header).toHaveTextContent('Oposición al requerimiento de elevación')
        expect(within(header).getByText('En 1 día hábil')).toBeInTheDocument()
    })

    /* CA-22.1: el chip arma su texto con `businessDaysRemaining`. */
    it.each([
        [-2, 'Vencido hace 2 días'],
        [0, 'Vence hoy'],
        [1, 'En 1 día hábil'],
        [10, 'En 10 días hábiles'],
    ])('con %i días hábiles restantes dice "%s"', (businessDaysRemaining, label) => {
        render(
            <CaseHeader case={{ ...WITH_STATE, currentState: { ...STATE, businessDaysRemaining } }} />,
        )

        expect(screen.getByText(label)).toBeInTheDocument()
    })

    /* CA-22.4: una causa sin actos está en "Iniciada" y no tiene vencimiento. */
    it('una causa recién registrada muestra "Iniciada" y "Sin plazo abierto"', () => {
        render(<CaseHeader case={WITHOUT_ACTS} />)

        const header = screen.getByRole('region', { name: 'Causa 14118903' })
        expect(header).toHaveTextContent('Iniciada')
        expect(within(header).getByText('Sin plazo abierto')).toBeInTheDocument()
    })

    /* CA-18.2 y CA-22.1 */
    it('una causa sin SAC se muestra como "Sin SAC"', () => {
        render(<CaseHeader case={WITHOUT_SAC} />)

        const header = screen.getByRole('region', { name: 'Causa sin SAC' })
        expect(header).toHaveTextContent('Sin SAC')
    })

    /* El instructor lleva tres datos, en campos separados (V3 D-33). */
    it('el instructor, su teléfono y su interno se muestran sólo si la pantalla lo pide', () => {
        const { rerender } = render(<CaseHeader case={WITH_STATE} />)
        expect(screen.queryByText('Dra. Verónica Ledesma')).not.toBeInTheDocument()

        rerender(<CaseHeader case={WITH_STATE} showInstructor />)
        const header = screen.getByRole('region', { name: 'Causa 13284571' })
        expect(header).toHaveTextContent('Instructor Dra. Verónica Ledesma')
        expect(header).toHaveTextContent('Teléfono 0351 448-1200')
        expect(header).toHaveTextContent('Interno 214')
    })

    it('las acciones que le pasa la pantalla van en el encabezado', () => {
        render(<CaseHeader case={WITH_STATE} actions={<button type="button">Registrar acto procesal</button>} />)

        expect(screen.getByRole('button', { name: 'Registrar acto procesal' })).toBeInTheDocument()
    })
})
