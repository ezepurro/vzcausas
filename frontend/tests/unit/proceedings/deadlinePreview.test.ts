import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { previewRequest } from '@/features/proceedings/utils/deadlinePreview'
import { CEDULA, ELEVACION } from './states'
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

    it('sin estado: vacío', () => {
        expect(previewRequest(EMPTY_VALUES, null, 'CRIMINAL')).toEqual({ kind: 'empty' })
    })

    it('estado escrito a mano: no se pide nada', () => {
        expect(previewRequest({ ...EMPTY_VALUES, stateText: ' Pedido de informes ' }, null, 'CRIMINAL'))
            .toEqual({ kind: 'custom', stateName: 'Pedido de informes' })
    })

    it('estado de la tabla con fecha del acto: se pide', () => {
        expect(previewRequest(WITH_STATE, CEDULA, 'CRIMINAL')).toEqual({
            kind: 'request',
            params: { proceduralStateId: 2, actDate: '2026-09-15' },
        })
    })

    it('fuera del administrativo, la notificación no viaja', () => {
        expect(previewRequest({ ...WITH_STATE, notificationDate: '2026-09-15' }, CEDULA, 'AMPARO')).toEqual({
            kind: 'request',
            params: { proceduralStateId: 2, actDate: '2026-09-15' },
        })
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

        it('si el estado no abre plazo, se pide sin notificación', () => {
            expect(previewRequest({ ...WITH_STATE, stateText: ELEVACION.name, proceduralStateId: '3' }, ELEVACION, 'ADMINISTRATIVE'))
                .toEqual({ kind: 'request', params: { proceduralStateId: 3, actDate: '2026-09-15' } })
        })

        it('con la notificación, se pide desde ahí', () => {
            expect(previewRequest({ ...WITH_STATE, actDate: '2026-09-10', notificationDate: '2026-09-14' }, CEDULA, 'ADMINISTRATIVE'))
                .toEqual({
                    kind: 'request',
                    params: { proceduralStateId: 2, actDate: '2026-09-10', notificationDate: '2026-09-14' },
                })
        })

        it('una notificación fuera de rango no se manda', () => {
            expect(previewRequest({ ...WITH_STATE, actDate: '2026-09-10', notificationDate: '2026-09-09' }, CEDULA, 'ADMINISTRATIVE').kind)
                .toBe('missing-base')
            expect(previewRequest({ ...WITH_STATE, notificationDate: '2026-09-16' }, CEDULA, 'ADMINISTRATIVE').kind)
                .toBe('missing-base')
        })
    })
})
