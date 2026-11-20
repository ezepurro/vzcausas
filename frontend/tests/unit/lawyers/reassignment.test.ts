import { describe, expect, it } from 'vitest'
import {
    assign,
    caseIdsFor,
    countByLawyer,
    emptyReassignment,
    isComplete,
    pendingCaseIds,
    syncReassignment,
    toDeleteLawyerBody,
    unassign,
} from '@/features/lawyers/utils/reassignment'
import { linkedUserNotice } from '@/features/lawyers/utils/linkedUserNotice'

/** El reparto de la baja de abogado (HU15, D-123). */
describe('reassignment', () => {
    it('arranca con todas las causas sin asignar', () => {
        const r = emptyReassignment([1, 2])
        expect(pendingCaseIds(r)).toEqual([1, 2])
        expect(isComplete(r)).toBe(false)
    })

    it('asigna y quita causas', () => {
        let r = assign(emptyReassignment([1, 2, 3]), [1, 2], 5)
        expect(caseIdsFor(r, 5)).toEqual([1, 2])
        expect(pendingCaseIds(r)).toEqual([3])
        r = unassign(r, [2])
        expect(pendingCaseIds(r)).toEqual([2, 3])
    })

    it('no inventa causas que no están en el reparto', () => {
        const r = assign(emptyReassignment([1]), [1, 99], 5)
        expect(Object.keys(r)).toEqual(['1'])
    })

    // CA-15.10: tras un 409 se conserva lo asignado y lo nuevo entra sin asignar.
    it('se rearma con las causas de ahora', () => {
        const r = syncReassignment(assign(emptyReassignment([1, 2]), [1, 2], 5), [2, 7])
        expect(r).toEqual({ 2: 5, 7: null })
    })

    // V6 L1769-1789: una entrada por causa activa; sin causas no hay cuerpo.
    it('arma el cuerpo del DELETE', () => {
        const r = assign(assign(emptyReassignment([1, 12]), [1], 4), [12], 5)
        expect(isComplete(r)).toBe(true)
        expect(toDeleteLawyerBody(r)).toEqual({
            reassignments: [
                { caseId: 1, responsibleLawyerId: 4 },
                { caseId: 12, responsibleLawyerId: 5 },
            ],
        })
        expect(toDeleteLawyerBody(emptyReassignment([]))).toBeUndefined()
    })

    // D-143: una causa que se confirma sin asignar viaja con `unassigned: true`, sin abogado.
    it('manda las que quedaron sin asignar con unassigned', () => {
        const r = assign(emptyReassignment([1, 12]), [1], 4)
        expect(isComplete(r)).toBe(false)
        expect(pendingCaseIds(r)).toEqual([12])
        expect(toDeleteLawyerBody(r)).toEqual({
            reassignments: [
                { caseId: 1, responsibleLawyerId: 4 },
                { caseId: 12, unassigned: true },
            ],
        })
    })

    it('cuenta cuántas causas pasan a cada abogado', () => {
        const r = assign(assign(emptyReassignment([1, 2, 3, 4]), [1, 2], 4), [3], 5)
        // La 4 queda sin asignar: no es de ningún abogado.
        expect([...countByLawyer(r)]).toEqual([[4, 2], [5, 1]])
    })
})

/** El aviso del usuario vinculado (CA-15.5, D-133). */
describe('linkedUserNotice', () => {
    it('sin usuario no hay aviso', () => {
        expect(linkedUserNotice(null)).toBeNull()
    })

    it('si Abogado era su único perfil, también queda dado de baja', () => {
        expect(linkedUserNotice({ id: 4, username: 'iperalta', roles: ['LAWYER'], lawyer: { id: 4 } }))
            .toMatch(/El usuario iperalta también queda dado de baja/)
    })

    it('con otros perfiles pierde solo el de Abogado', () => {
        expect(linkedUserNotice({ id: 2, username: 'ozarate', roles: ['ADMINISTRATOR', 'LAWYER'], lawyer: { id: 2 } }))
            .toMatch(/El usuario ozarate pierde el perfil Abogado/)
    })
})
