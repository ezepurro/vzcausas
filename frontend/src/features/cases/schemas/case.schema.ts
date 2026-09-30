/**
 * Validación del alta de causa.
 * El backend las vuelve a verificar: validar acá es para no gastar un viaje al
 * servidor y para decir qué campo está mal, no para reemplazarlo.
 *
 * Los límites son los del cuerpo de `POST /cases` (V3 §3.7).
 */

import { todayIsoDate } from '@/shared/lib/dates'
import {
    PROCEDURAL_ROLES_BY_JURISDICTION,
    type CaseFormValues,
} from '@/features/cases/types/case'

export type CaseFormErrors = Partial<Record<keyof CaseFormValues, string>>

/** El SAC tiene exactamente 8 dígitos (V3 D-16). */
const SAC_PATTERN = /^\d{8}$/

const CAPTION_MAX = 255
const COURT_MAX = 255
const INSTRUCTOR_MAX = 150
const PHONE_MAX = 50
const COUNTERPARTY_MAX = 255

export function validateCase(values: CaseFormValues): CaseFormErrors {
    const errors: CaseFormErrors = {}
    const criminal = values.jurisdiction === 'CRIMINAL'

    const sac = values.sacNumber.trim()
    if (!sac) {
        errors.sacNumber = 'El número de SAC es obligatorio.'
    } else if (!SAC_PATTERN.test(sac)) {
        errors.sacNumber = 'El SAC tiene 8 dígitos.'
    }

    const caption = values.caption.trim()
    if (!caption) {
        errors.caption = 'La carátula es obligatoria.'
    } else if (caption.length > CAPTION_MAX) {
        errors.caption = `Puede tener hasta ${CAPTION_MAX} caracteres.`
    }

    if (values.court.trim().length > COURT_MAX) {
        errors.court = `Puede tener hasta ${COURT_MAX} caracteres.`
    }
    if (values.instructorName.trim().length > INSTRUCTOR_MAX) {
        errors.instructorName = `Puede tener hasta ${INSTRUCTOR_MAX} caracteres.`
    }
    if (values.instructorPhone.trim().length > PHONE_MAX) {
        errors.instructorPhone = `Puede tener hasta ${PHONE_MAX} caracteres.`
    }

    if (!values.clientId) {
        errors.clientId = 'Elegí el cliente de la causa.'
    }

    // El formulario ya resetea el rol al cambiar de fuero; esto cubre el caso
    // en que igual quedó uno que el fuero no admite.
    if (!PROCEDURAL_ROLES_BY_JURISDICTION[values.jurisdiction].includes(values.proceduralRole)) {
        errors.proceduralRole = 'Ese rol procesal no corresponde al fuero.'
    }

    if (criminal && values.legalQualificationIds.length === 0) {
        errors.legalQualificationIds = 'Una causa penal necesita al menos una calificación legal.'
    }

    if (!criminal && values.counterparty.trim().length > COUNTERPARTY_MAX) {
        errors.counterparty = `Puede tener hasta ${COUNTERPARTY_MAX} caracteres.`
    }

    if (!values.responsibleLawyerId) {
        errors.responsibleLawyerId = 'Elegí el abogado responsable.'
    }

    // Las dos son `YYYY-MM-DD`, así que se comparan como texto.
    if (values.startDate && values.startDate > todayIsoDate()) {
        errors.startDate = 'La fecha de inicio no puede ser posterior a hoy.'
    }

    return errors
}

/** `true` si no hay ningún error. Evita repetir el `Object.keys` en la pantalla. */
export function isValid(errors: CaseFormErrors): boolean {
    return Object.keys(errors).length === 0
}
