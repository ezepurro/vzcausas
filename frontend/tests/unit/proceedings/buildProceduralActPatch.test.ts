import { describe, expect, it } from 'vitest'
import {
    buildProceduralActPatch,
    hasChanges,
    keepsSavedTerm,
} from '@/features/proceedings/utils/buildProceduralActPatch'
import { toActFormValues } from '@/features/proceedings/utils/toActFormValues'
import type { ProceduralAct, ProceduralActFormValues } from '@/features/proceedings/types/proceduralAct'
import { ARCHIVADA, CEDULA, DADO_DE_BAJA, OPOSICION } from './states'

/**
 * El parche de "Modificar acto procesal" (HU28) manda sólo lo que cambió
 * respecto del acto abierto: un PATCH vacío es un 400 (CA-28.3), y cambiar el
 * estado recalcula el plazo con la tabla de hoy (D-98), así que el estado no
 * puede viajar si no cambió.
 */

const ACT: ProceduralAct = {
    id: 3,
    caseId: 1,
    resultingState: { proceduralStateId: OPOSICION.id, name: OPOSICION.name, custom: false },
    actDate: '2026-09-09',
    notificationDate: null,
    notes: 'Abre el plazo.',
    deadline: {
        timeLimitDays: 5,
        dayType: 'BUSINESS',
        countsFrom: '2026-09-09',
        computedDueDate: '2026-09-16',
        dueDate: '2026-09-16',
        manuallyAdjusted: false,
        manualTimeLimitDays: null,
    },
    registeredBy: { id: 3, lastName: 'Ríos', firstName: 'Malena' },
    registeredAt: '2026-09-09T11:42:00-03:00',
    lastModifiedBy: null,
    lastModifiedAt: null,
}

/** El acto con el vencimiento ajustado a mano al 18/09. */
const ADJUSTED: ProceduralAct = {
    ...ACT,
    deadline: { ...ACT.deadline!, dueDate: '2026-09-18', manuallyAdjusted: true, manualTimeLimitDays: 7 },
}

const CUSTOM: ProceduralAct = {
    ...ACT,
    resultingState: { proceduralStateId: null, name: 'En espera de pericia', custom: true },
    deadline: null,
}

function values(act: ProceduralAct, overrides: Partial<ProceduralActFormValues> = {}): ProceduralActFormValues {
    return { ...toActFormValues(act), ...overrides }
}

describe('buildProceduralActPatch', () => {
    // CA-28.3: sin cambios no hay nada que mandar.
    it('el acto tal como se abrió no tiene cambios', () => {
        const patch = buildProceduralActPatch(ACT, values(ACT), OPOSICION, 'CRIMINAL')
        expect(patch).toEqual({})
        expect(hasChanges(patch)).toBe(false)
    })

    it('un ajuste manual sin tocar tampoco es un cambio (CA-28.6)', () => {
        expect(buildProceduralActPatch(ADJUSTED, values(ADJUSTED), OPOSICION, 'CRIMINAL')).toEqual({})
    })

    it('un estado escrito a mano sin tocar no viaja', () => {
        expect(buildProceduralActPatch(CUSTOM, values(CUSTOM), null, 'CRIMINAL')).toEqual({})
    })

    /* Un estado de la tabla dado de baja después de registrar el acto no está
       entre las opciones y no se resuelve: dejarlo como estaba no lo cambia. */
    it('un estado de la tabla que ya no se ofrece, sin tocar, no viaja', () => {
        const act: ProceduralAct = {
            ...ACT,
            resultingState: { proceduralStateId: DADO_DE_BAJA.id, name: DADO_DE_BAJA.name, custom: false },
        }
        expect(buildProceduralActPatch(act, values(act), null, 'CRIMINAL')).toEqual({})
    })

    // CA-28.1: viajan sólo los campos cambiados.
    it('corregir las observaciones manda sólo las observaciones, recortadas', () => {
        const patch = buildProceduralActPatch(ACT, values(ACT, { notes: '  Otra observación. ' }), OPOSICION, 'CRIMINAL')
        expect(patch).toEqual({ notes: 'Otra observación.' })
    })

    it('vaciar las observaciones las borra con null', () => {
        expect(buildProceduralActPatch(ACT, values(ACT, { notes: '   ' }), OPOSICION, 'CRIMINAL')).toEqual({ notes: null })
    })

    // CA-28.4: el estado nuevo viaja como id de la tabla o escrito a mano, nunca los dos.
    it('cambiar a otro estado de la tabla manda su id', () => {
        const form = values(ACT, { stateText: CEDULA.name, proceduralStateId: String(CEDULA.id) })
        expect(buildProceduralActPatch(ACT, form, CEDULA, 'CRIMINAL')).toEqual({ proceduralStateId: CEDULA.id })
    })

    it('cambiar a un estado escrito a mano manda el texto', () => {
        const form = values(ACT, { stateText: ' En espera de pericia ', proceduralStateId: '' })
        expect(buildProceduralActPatch(ACT, form, null, 'CRIMINAL')).toEqual({ customState: 'En espera de pericia' })
    })

    // CA-28.5: cambiar la fecha sin cambiar el estado manda sólo la fecha.
    it('corregir la fecha del acto manda sólo la fecha', () => {
        const patch = buildProceduralActPatch(ACT, values(ACT, { actDate: '2026-09-08' }), OPOSICION, 'CRIMINAL')
        expect(patch).toEqual({ actDate: '2026-09-08' })
    })

    // CA-28.6: destildar el ajuste vuelve al vencimiento calculado.
    it('destildar un ajuste manual manda manualDueDate en null', () => {
        const form = values(ADJUSTED, { manualDue: false })
        expect(buildProceduralActPatch(ADJUSTED, form, OPOSICION, 'CRIMINAL')).toEqual({ manualDueDate: null })
    })

    it('ajustar a mano un acto que no lo estaba manda la fecha', () => {
        const form = values(ACT, { manualDue: true, manualDueDate: '2026-09-21' })
        expect(buildProceduralActPatch(ACT, form, OPOSICION, 'CRIMINAL')).toEqual({ manualDueDate: '2026-09-21' })
    })

    /* Hacia un estado terminal no hay ajuste manual (V4 §3.8): la pantalla lo
       manda destildado, y si el acto tenía uno se quita. */
    it('pasar a un estado terminal quita el ajuste manual que tenía', () => {
        const form = values(ADJUSTED, { stateText: ARCHIVADA.name, proceduralStateId: String(ARCHIVADA.id), manualDue: false })
        expect(buildProceduralActPatch(ADJUSTED, form, ARCHIVADA, 'CRIMINAL')).toEqual({
            proceduralStateId: ARCHIVADA.id,
            manualDueDate: null,
        })
    })

    // RN6: la notificación sólo existe en el administrativo.
    it('la notificación viaja sólo en el fuero administrativo', () => {
        const form = values(ACT, { notificationDate: '2026-09-10' })
        expect(buildProceduralActPatch(ACT, form, OPOSICION, 'CRIMINAL')).toEqual({})
        expect(buildProceduralActPatch(ACT, form, OPOSICION, 'ADMINISTRATIVE')).toEqual({ notificationDate: '2026-09-10' })
    })
})

/* D-98: si no cambian ni el estado ni las fechas, rige el plazo guardado del
   acto, no el que daría la tabla de hoy. */
describe('keepsSavedTerm', () => {
    it('las observaciones o el ajuste manual no cambian el plazo del acto', () => {
        expect(keepsSavedTerm({})).toBe(true)
        expect(keepsSavedTerm({ notes: 'Otra.' })).toBe(true)
        expect(keepsSavedTerm({ manualDueDate: null })).toBe(true)
    })

    it('el estado o una fecha sí lo cambian', () => {
        expect(keepsSavedTerm({ proceduralStateId: 2 })).toBe(false)
        expect(keepsSavedTerm({ customState: 'Otro' })).toBe(false)
        expect(keepsSavedTerm({ actDate: '2026-09-08' })).toBe(false)
        expect(keepsSavedTerm({ notificationDate: null })).toBe(false)
    })
})
