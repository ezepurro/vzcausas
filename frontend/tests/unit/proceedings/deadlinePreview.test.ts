import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { previewRequest } from '@/features/proceedings/utils/deadlinePreview'
import { CEDULA } from './states'
import { EMPTY_VALUES } from './values'

const WITH_STATE = { ...EMPTY_VALUES, stateText: CEDULA.name, proceduralStateId: '2' }

describe('previewRequest', () => {
    beforeEach(() => {
        vi.useFakeTimers({ toFake: ['Date'] })
        vi.setSystemTime(new Date(2026, 8, 15, 12, 0, 0))
    })
    afterEach(() => {
        vi.useRealTimers()
    })

    it('sin fecha del acto, o futura, no se pide', () => {
        expect(previewRequest({ ...WITH_STATE, actDate: '' }, CEDULA, 'CRIMINAL').kind).toBe('missing-base')
        expect(previewRequest({ ...WITH_STATE, actDate: '2026-09-16' }, CEDULA, 'CRIMINAL').kind).toBe('missing-base')
    })

    describe('fuero administrativo', () => {
        it('si el estado abre plazo, espera la notificación', () => {
            expect(previewRequest(WITH_STATE, CEDULA, 'ADMINISTRATIVE')).toEqual({
                kind: 'missing-base',
                message: 'Cargá la fecha de notificación: en el fuero administrativo el plazo corre desde ahí.',
            })
        })

        it('con la notificación, se pide desde ahí', () => {
            expect(previewRequest({ ...WITH_STATE, actDate: '2026-09-10', notificationDate: '2026-09-14' }, CEDULA, 'ADMINISTRATIVE'))
                .toEqual({
                    kind: 'request',
                    params: { proceduralStateId: 2, actDate: '2026-09-10', notificationDate: '2026-09-14' },
                })
        })
    })
})
