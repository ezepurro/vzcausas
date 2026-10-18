import { describe, expect, it } from 'vitest'
import { toCreateProceduralActBody } from '@/features/proceedings/utils/toCreateProceduralActBody'
import { CEDULA } from './states'
import { EMPTY_VALUES } from './values'

describe('toCreateProceduralActBody', () => {
    it('el vencimiento manual sólo viaja con el ajuste tildado', () => {
        const values = { ...EMPTY_VALUES, stateText: CEDULA.name, manualDueDate: '2026-09-25' }
        expect(toCreateProceduralActBody({ ...values, manualDue: true }, CEDULA, 'CRIMINAL').manualDueDate).toBe('2026-09-25')
        expect(toCreateProceduralActBody(values, CEDULA, 'CRIMINAL')).not.toHaveProperty('manualDueDate')
    })
})
