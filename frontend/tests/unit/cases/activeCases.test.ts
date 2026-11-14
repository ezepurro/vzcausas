import { describe, expect, it } from 'vitest'
import { activeCasesOf } from '@/features/cases/utils/activeCases'
import type { Case } from '@/features/cases'
import type { ProceduralState } from '@/features/legal-params'

/**
 * Las causas activas de un cliente, para mostrar por qué no se puede dar de
 * baja (CA-11.2, D-122): el `409 CLIENT_HAS_ACTIVE_CASES` no trae la lista,
 * así que se piden sus causas (`GET /cases?clientId=`) y se quedan las que no
 * están en un estado terminal (V6 §3.6, `DELETE /clients/{clientId}`).
 *
 * La causa no dice si su estado es terminal: se busca en la tabla de estados.
 * "Iniciada" y un estado escrito a mano nunca lo son (V6 §4, "Proceso diario":
 * "Un estado escrito a mano no es terminal").
 */

function state(id: number, name: string, terminal: boolean): ProceduralState {
    return { id, name, jurisdiction: 'CRIMINAL', timeLimitDays: 0, dayType: 'NONE', terminal, caseCount: 0, active: true }
}

const CEDULA = state(2, 'Cédula de notificación', false)
const ARCHIVADA = state(9, 'Archivada', true)
const PRESCRIPTA = state(10, 'Prescripta', true)
const STATES = [CEDULA, ARCHIVADA, PRESCRIPTA]

/** Sólo lo que mira la función: el id y el estado actual. */
function aCase(id: number, currentState: { proceduralStateId: number | null; name: string; custom?: boolean; initial?: boolean }): Case {
    return {
        id,
        currentState: {
            custom: false,
            initial: false,
            proceduralActId: null,
            dueDate: null,
            businessDaysRemaining: null,
            manuallyAdjusted: false,
            ...currentState,
        },
    } as Case
}

describe('activeCasesOf', () => {
    // CA-11.2: las causas en estado terminal no impiden la baja, así que no se listan.
    it('deja afuera las causas en un estado terminal, Archivada o Prescripta', () => {
        const cases = [
            aCase(1, { proceduralStateId: 2, name: 'Cédula de notificación' }),
            aCase(9, { proceduralStateId: 9, name: 'Archivada' }),
            aCase(10, { proceduralStateId: 10, name: 'Prescripta' }),
        ]
        expect(activeCasesOf(cases, STATES).map((c) => c.id)).toEqual([1])
    })

    // CA-11.2 y V6 §4: "Iniciada" y un estado escrito a mano son activos.
    it('una causa en "Iniciada" o con un estado escrito a mano cuenta como activa', () => {
        const cases = [
            aCase(7, { proceduralStateId: null, name: 'Iniciada', initial: true }),
            aCase(8, { proceduralStateId: null, name: 'Pedido de informes al Registro', custom: true }),
        ]
        expect(activeCasesOf(cases, STATES).map((c) => c.id)).toEqual([7, 8])
    })
})
