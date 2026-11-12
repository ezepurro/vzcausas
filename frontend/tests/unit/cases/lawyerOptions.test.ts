import { describe, expect, it } from 'vitest'
import { buildLawyerOptions } from '@/features/cases/utils/lawyerOptions'
import type { Lawyer } from '@/features/lawyers'

/**
 * Las opciones del select "Abogado responsable" del alta y de "Modificar
 * causa": si quien usa la pantalla es abogado, su ficha va primero y lo dice.
 */
describe('buildLawyerOptions', () => {
    const lawyer = (id: number, lastName: string, firstName: string, registrationNumber: string | null): Lawyer => ({
        id,
        lastName,
        firstName,
        registrationNumber,
        activeCases: 0,
        active: true,
    })
    const vazquez = lawyer(1, 'Vázquez', 'Fernando', '1-28114')
    const rios = lawyer(3, 'Ríos', 'Malena', '1-36842')
    const campos = lawyer(9, 'Campos', 'Julieta', null)

    it('sin ficha de abogado, las opciones quedan en el orden en que llegan', () => {
        expect(buildLawyerOptions([vazquez, rios, campos], null)).toEqual([
            { value: '1', label: 'Vázquez, Fernando · matrícula 1-28114' },
            { value: '3', label: 'Ríos, Malena · matrícula 1-36842' },
            { value: '9', label: 'Campos, Julieta' },
        ])
    })

    it('si quien la usa es abogado, su ficha va primero con "(asignarme a mí)" y el resto sigue en su orden', () => {
        expect(buildLawyerOptions([vazquez, rios, campos], 3)).toEqual([
            { value: '3', label: 'Ríos, Malena · matrícula 1-36842 (asignarme a mí)' },
            { value: '1', label: 'Vázquez, Fernando · matrícula 1-28114' },
            { value: '9', label: 'Campos, Julieta' },
        ])
    })

    it('si su ficha no está entre los abogados vigentes, no se agrega', () => {
        expect(buildLawyerOptions([vazquez, campos], 3).map((option) => option.value)).toEqual(['1', '9'])
    })
})
