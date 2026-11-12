import { describe, expect, it } from 'vitest'
import { lawyerLabel } from '@/features/lawyers/utils/lawyerLabel'
import { toCreateLawyerBody } from '@/features/lawyers/utils/toCreateLawyerBody'

describe('lawyerLabel', () => {
    it('nombre y matrícula juntos', () => {
        expect(lawyerLabel({ lastName: 'Ríos', firstName: 'Malena', registrationNumber: '1-36842' })).toBe(
            'Ríos, Malena · matrícula 1-36842',
        )
    })

    it('sin matrícula, sólo el nombre', () => {
        expect(lawyerLabel({ lastName: 'Ríos', firstName: 'Malena', registrationNumber: null })).toBe('Ríos, Malena')
    })
})

describe('toCreateLawyerBody', () => {
    it('la matrícula vacía no viaja', () => {
        expect(toCreateLawyerBody({ lastName: 'Pérez', firstName: 'Ana', registrationNumber: '  ' })).toEqual({
            lastName: 'Pérez',
            firstName: 'Ana',
        })
    })
})
