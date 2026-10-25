/**
 * Acto interruptivo: las formas sacadas del contrato (V4 §3.9).
 *
 * Reinicia el cómputo de la prescripción de la causa desde su fecha (RN8,
 * HU31). No mueve el estado procesal ni abre un plazo: por eso es un recurso
 * propio y no un acto procesal con una marca (D-48). Sólo existe en el fuero
 * penal y lo registra sólo el abogado responsable de la causa (D-50).
 */

/** El recurso tal como viene adentro de `data`. */
export interface InterruptiveAct {
    id: number
    caseId: number
    /** Texto libre: "Citación a juicio", "Indagatoria" (D-49). */
    name: string
    actDate: string
    notes: string | null
    /** Apellido y nombres separados (D-68). */
    registeredBy: { id: number; lastName: string; firstName: string }
    /** Fecha y hora del registro, ISO 8601. */
    registeredAt: string
}

/** Cuerpo del `POST /cases/{caseId}/interruptive-acts`. */
export interface CreateInterruptiveActBody {
    name: string
    actDate: string
    notes?: string
}

/** Los valores del modal "Registrar acto interruptivo". */
export type InterruptiveActFormValues = {
    /** "Acto interruptivo". */
    name: string
    /** "Fecha del acto", `YYYY-MM-DD`. */
    actDate: string
    /** "Observaciones". */
    notes: string
}
