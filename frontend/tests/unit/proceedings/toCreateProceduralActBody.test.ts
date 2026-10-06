import { describe, expect, it } from 'vitest'
import { toCreateProceduralActBody } from '@/features/proceedings/utils/toCreateProceduralActBody'
import { CEDULA } from './states'
import { EMPTY_VALUES } from './values'

describe('toCreateProceduralActBody', () => {
    it('estado de la tabla: manda sólo el id', () => {
        expect(toCreateProceduralActBody({ ...EMPTY_VALUES, stateText: CEDULA.name, proceduralStateId: '2' }, CEDULA, 'CRIMINAL'))
            .toEqual({ proceduralStateId: 2, actDate: '2026-09-15' })
    })

    it('estado escrito a mano: manda el texto recortado y no el id', () => {
        expect(toCreateProceduralActBody({ ...EMPTY_VALUES, stateText: '  Pedido de informes  ' }, null, 'CRIMINAL'))
            .toEqual({ customState: 'Pedido de informes', actDate: '2026-09-15' })
    })

    it('la notificación sólo viaja en el administrativo', () => {
        const values = { ...EMPTY_VALUES, stateText: CEDULA.name, notificationDate: '2026-09-15' }
        expect(toCreateProceduralActBody(values, CEDULA, 'ADMINISTRATIVE').notificationDate).toBe('2026-09-15')
        expect(toCreateProceduralActBody(values, CEDULA, 'AMPARO')).not.toHaveProperty('notificationDate')
    })

    it('el vencimiento manual sólo viaja con el ajuste tildado', () => {
        const values = { ...EMPTY_VALUES, stateText: CEDULA.name, manualDueDate: '2026-09-25' }
        expect(toCreateProceduralActBody({ ...values, manualDue: true }, CEDULA, 'CRIMINAL').manualDueDate).toBe('2026-09-25')
        expect(toCreateProceduralActBody(values, CEDULA, 'CRIMINAL')).not.toHaveProperty('manualDueDate')
    })

    it('las observaciones se recortan, y vacías no viajan', () => {
        const values = { ...EMPTY_VALUES, stateText: CEDULA.name }
        expect(toCreateProceduralActBody({ ...values, notes: '  Con oposición. ' }, CEDULA, 'CRIMINAL').notes).toBe('Con oposición.')
        expect(toCreateProceduralActBody({ ...values, notes: '   ' }, CEDULA, 'CRIMINAL')).not.toHaveProperty('notes')
    })
})
