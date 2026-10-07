import { describe, expect, it, vi } from 'vitest'
import { render, screen, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import type { SelectOption, SelectOptionGroup } from '@/shared/components/forms'
import { CaseFilters, type CaseFiltersProps } from '@/features/cases/components/CaseFilters'
import {
    ALL_STATES,
    customStateFilterValue,
    stateFilterValue,
    WITHOUT_ACTS,
} from '@/features/cases/utils/stateFilter'

/**
 * Los filtros del listado de causas (HU-20). Cada test dice qué criterio de
 * aceptación cubre.
 *
 * El componente es presentacional: recibe lo elegido y las opciones ya armadas,
 * y avisa con callbacks. Qué hace la pantalla con cada aviso —volver a la
 * página 1, pedir de nuevo— está en `CasesPage.test.tsx`.
 */

const LAWYERS: SelectOption[] = [
    { value: '3', label: 'Dra. Malena Ríos' },
    { value: '4', label: 'Dr. Ignacio Peralta' },
]

const CUSTOM = 'Con acusación, pero con oposición'

/** Las tres clases de opciones, como las arma la pantalla. "Archivada" existe en más de un fuero. */
const STATES: SelectOptionGroup[] = [
    {
        group: 'Fuero Penal',
        options: [
            { value: stateFilterValue(4), label: 'Oposición al requerimiento de elevación' },
            { value: stateFilterValue(9), label: 'Archivada' },
        ],
    },
    {
        group: 'Fuero Administrativo',
        options: [
            { value: stateFilterValue(14), label: 'Alegato' },
            { value: stateFilterValue(17), label: 'Archivada' },
        ],
    },
    { group: 'Causas nuevas', options: [{ value: WITHOUT_ACTS, label: 'Iniciada' }] },
    { group: 'Escritos a mano en causas', options: [{ value: customStateFilterValue(CUSTOM), label: CUSTOM }] },
]

function setup(props: Partial<CaseFiltersProps> = {}) {
    const handlers = {
        onJurisdictionChange: vi.fn(),
        onResponsibleLawyerChange: vi.fn(),
        onStateChange: vi.fn(),
        onOpenDeadlineChange: vi.fn(),
        onClear: vi.fn(),
    }
    render(
        <CaseFilters
            jurisdiction=""
            responsibleLawyerId=""
            state={ALL_STATES}
            openDeadline={false}
            lawyerOptions={LAWYERS}
            stateOptions={STATES}
            {...handlers}
            {...props}
        />,
    )
    return { user: userEvent.setup(), ...handlers }
}

const jurisdictionSelect = () => screen.getByRole('combobox', { name: 'Filtrar por fuero' })
const lawyerSelect = () => screen.getByRole('combobox', { name: 'Filtrar por responsable' })
const stateSelect = () => screen.getByRole('combobox', { name: 'Filtrar por estado procesal' })
const openDeadlineButton = () => screen.getByRole('button', { name: 'Solo con plazo por vencer' })

/** Los textos de las opciones de un desplegable, o de uno de sus grupos. */
const optionsOf = (element: HTMLElement) => within(element).getAllByRole('option').map((o) => o.textContent)

describe('CaseFilters', () => {
    /* CA-20.3: los cuatro filtros del listado. */
    it('ofrece filtrar por fuero, por responsable, por estado procesal y por plazo, sin nada elegido', () => {
        setup()

        expect(jurisdictionSelect()).toHaveDisplayValue('Todos los fueros')
        expect(lawyerSelect()).toHaveDisplayValue('Todos los responsables')
        expect(stateSelect()).toHaveDisplayValue('Todos los estados procesales')
        expect(openDeadlineButton()).toHaveAttribute('aria-pressed', 'false')
    })

    /* CA-20.3 */
    it('ofrece los tres fueros y avisa con el código del que se elige', async () => {
        const { user, onJurisdictionChange } = setup()

        expect(optionsOf(jurisdictionSelect())).toEqual(['Todos los fueros', 'Penal', 'Administrativo', 'Amparo'])

        await user.selectOptions(jurisdictionSelect(), 'Administrativo')

        expect(onJurisdictionChange).toHaveBeenCalledWith('ADMINISTRATIVE')
    })

    /* CA-20.3: sacar el filtro también es una elección. */
    it('"Todos los fueros" avisa que ya no hay fuero elegido', async () => {
        const { user, onJurisdictionChange } = setup({ jurisdiction: 'CRIMINAL' })

        await user.selectOptions(jurisdictionSelect(), 'Todos los fueros')

        expect(onJurisdictionChange).toHaveBeenCalledWith('')
    })

    /* CA-20.8 */
    it('ofrece los abogados que recibe y avisa con el id del que se elige', async () => {
        const { user, onResponsibleLawyerChange } = setup()

        expect(optionsOf(lawyerSelect())).toEqual(['Todos los responsables', 'Dra. Malena Ríos', 'Dr. Ignacio Peralta'])

        await user.selectOptions(lawyerSelect(), 'Dra. Malena Ríos')

        expect(onResponsibleLawyerChange).toHaveBeenCalledWith('3')
    })

    /* CA-20.4: las tres clases se ven separadas, cada una en su grupo. */
    it('dibuja los estados en los grupos que recibe', () => {
        setup()

        const groups = within(stateSelect()).getAllByRole('group')
        expect(groups.map((group) => group.getAttribute('label'))).toEqual([
            'Fuero Penal',
            'Fuero Administrativo',
            'Causas nuevas',
            'Escritos a mano en causas',
        ])
        expect(groups.map(optionsOf)).toEqual([
            ['Oposición al requerimiento de elevación', 'Archivada'],
            ['Alegato', 'Archivada'],
            ['Iniciada'],
            [CUSTOM],
        ])
    })

    /* CA-20.4: se elige una sola opción, y su valor dice de qué clase es. */
    it.each([
        ['un estado de la tabla del fuero', stateFilterValue(4)],
        ['un estado que se llama igual en otro fuero', stateFilterValue(17)],
        ['el estado inicial "Iniciada"', WITHOUT_ACTS],
        ['un estado escrito a mano', customStateFilterValue(CUSTOM)],
    ])('al elegir %s avisa con ese único valor', async (_, value) => {
        const { user, onStateChange } = setup()

        await user.selectOptions(stateSelect(), value)

        expect(onStateChange).toHaveBeenCalledTimes(1)
        expect(onStateChange).toHaveBeenCalledWith(value)
    })

    /* CA-20.3 */
    it('"Solo con plazo por vencer" avisa que se prendió', async () => {
        const { user, onOpenDeadlineChange } = setup()

        await user.click(openDeadlineButton())

        expect(onOpenDeadlineChange).toHaveBeenCalledWith(true)
    })

    /* CA-20.3: prendido se anuncia como apretado, y tocarlo de nuevo lo apaga. */
    it('prendido se muestra apretado y avisa que se apagó', async () => {
        const { user, onOpenDeadlineChange } = setup({ openDeadline: true })

        expect(openDeadlineButton()).toHaveAttribute('aria-pressed', 'true')

        await user.click(openDeadlineButton())

        expect(onOpenDeadlineChange).toHaveBeenCalledWith(false)
    })

    /* CA-20.3: lo que se ve elegido es lo que la pantalla está filtrando. */
    it('muestra elegido lo que recibe', () => {
        setup({ jurisdiction: 'AMPARO', responsibleLawyerId: '4', state: WITHOUT_ACTS })

        expect(jurisdictionSelect()).toHaveDisplayValue('Amparo')
        expect(lawyerSelect()).toHaveDisplayValue('Dr. Ignacio Peralta')
        expect(stateSelect()).toHaveDisplayValue('Iniciada')
    })

    describe('"Limpiar filtros" (prototipo)', () => {
        /* Sin criterio de aceptación: sale de la pantalla Causas del prototipo. */
        it('no aparece si no hay nada filtrado', () => {
            setup()

            expect(screen.queryByRole('button', { name: 'Limpiar filtros' })).not.toBeInTheDocument()
        })

        it.each<[string, Partial<CaseFiltersProps>]>([
            ['un fuero', { jurisdiction: 'CRIMINAL' }],
            ['un responsable', { responsibleLawyerId: '3' }],
            ['un estado procesal', { state: stateFilterValue(4) }],
            ['"Solo con plazo por vencer"', { openDeadline: true }],
        ])('aparece con %s elegido, y avisa', async (_, props) => {
            const { user, onClear } = setup(props)

            await user.click(screen.getByRole('button', { name: 'Limpiar filtros' }))

            expect(onClear).toHaveBeenCalledTimes(1)
        })
    })
})
