import type { ProceduralState } from '@/features/legal-params'

/** Un ciclo penal chico para los tests de `proceedings`, desordenado a propósito. */
function state(overrides: Partial<ProceduralState> & Pick<ProceduralState, 'id' | 'name'>): ProceduralState {
    return {
        jurisdiction: 'CRIMINAL',
        timeLimitDays: 5,
        dayType: 'BUSINESS',
        terminal: false,
        caseCount: 0,
        active: true,
        ...overrides,
    }
}

export const OPOSICION = state({ id: 12, name: 'Oposición al requerimiento' })
export const CEDULA = state({ id: 2, name: 'Cédula de notificación', timeLimitDays: 3 })
export const ELEVACION = state({ id: 3, name: 'Requerimiento de elevación a juicio', timeLimitDays: 0, dayType: 'NONE' })
export const RECURSO = state({ id: 4, name: 'Recurso de apelación', timeLimitDays: 10, dayType: 'CONSECUTIVE' })
export const ARCHIVADA = state({ id: 9, name: 'Archivada', timeLimitDays: 0, dayType: 'NONE', terminal: true })
export const DADO_DE_BAJA = state({ id: 7, name: 'Estado dado de baja', active: false })

export const STATES: ProceduralState[] = [OPOSICION, ARCHIVADA, CEDULA, DADO_DE_BAJA, RECURSO, ELEVACION]
