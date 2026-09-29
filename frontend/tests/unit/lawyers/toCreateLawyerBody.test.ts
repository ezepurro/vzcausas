import { describe, expect, it } from 'vitest'
import { toCreateLawyerBody } from '@/features/lawyers/utils/toCreateLawyerBody'

describe('toCreateLawyerBody', () => {
    it('arma el cuerpo del POST con los dos campos', () => {
        expect(toCreateLawyerBody({ fullName: 'Dra. Ana Pérez', registrationNumber: '1-28114' })).toEqual({
            fullName: 'Dra. Ana Pérez',
            registrationNumber: '1-28114',
        })
    })

    it('recorta los espacios de los dos campos', () => {
        expect(
            toCreateLawyerBody({ fullName: '  Dra. Ana Pérez ', registrationNumber: ' 1-28114  ' }),
        ).toEqual({ fullName: 'Dra. Ana Pérez', registrationNumber: '1-28114' })
    })

    it('no agrega campos que no son del contrato', () => {
        const body = toCreateLawyerBody({ fullName: 'Ana', registrationNumber: '1-28114' })
        expect(Object.keys(body).sort()).toEqual(['fullName', 'registrationNumber'])
    })
})
