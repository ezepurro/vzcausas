import type { ProceduralState } from '@/features/legal-params'

/** Un ciclo penal chico para los tests de `proceedings`, desordenado a propósito. */
function state(overrides: Partial<ProceduralState> & Pick<ProceduralState, 'id' | 'name' | 'position'>): ProceduralState {
    return {
        jurisdiction: 'CRIMINAL',
        timeLimitDays: 5,
        dayType: 'BUSINESS',
        terminal: false,
        activeCases: 0,
        active: true,
        ...overrides,
    }
}

export const OPOSICION = state({ id: 12, name: 'Oposición al requerimiento', position: 3 })
export const CEDULA = state({ id: 2, name: 'Cédula de notificación', position: 1, timeLimitDays: 3 })
export const ELEVACION = state({ id: 3, name: 'Requerimiento de elevación a juicio', position: 2, timeLimitDays: 0, dayType: 'NONE' })
export const RECURSO = state({ id: 4, name: 'Recurso de apelación', position: 4, timeLimitDays: 10, dayType: 'CONSECUTIVE' })
export const ARCHIVADA = state({ id: 9, name: 'Archivada', position: 5, timeLimitDays: 0, dayType: 'NONE', terminal: true })
export const DADO_DE_BAJA = state({ id: 7, name: 'Estado dado de baja', position: 6, active: false })

export const STATES: ProceduralState[] = [OPOSICION, ARCHIVADA, CEDULA, DADO_DE_BAJA, RECURSO, ELEVACION]
