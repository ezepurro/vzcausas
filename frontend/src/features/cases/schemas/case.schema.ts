/**
 * Validación del alta de causa.
 * El backend las vuelve a verificar: validar acá es para no gastar un viaje al
 * servidor y para decir qué campo está mal, no para reemplazarlo.
 *
 * Los límites son los del cuerpo de `POST /cases` (V4 §3.7).
 */

import { parseDateOnly, todayIsoDate } from '@/shared/lib/dates'
import {
    PROCEDURAL_ROLES_BY_JURISDICTION,
    type CaseFormValues,
} from '@/features/cases/types/case'

/**
 * Un error por campo, más el detalle de las fechas del hecho.
 *
 * `legalQualifications` es el mensaje del grupo, el que va debajo del selector
 * (es también la clave con la que el backend informa sus errores).
 * `offenseDates` dice además **cuál** fila está mal, por id de calificación,
 * para que el formulario marque esa fecha y no todas.
 */
export type CaseFormErrors = Partial<Record<keyof CaseFormValues, string>> & {
    offenseDates?: Record<number, string>
}

/** El SAC tiene exactamente 8 dígitos (V3 D-16). */
const SAC_PATTERN = /^\d{8}$/

const CAPTION_MAX = 255
const COURT_MAX = 255
const INSTRUCTOR_MAX = 150
const PHONE_MAX = 50
const EXTENSION_MAX = 20
const COUNTERPARTY_MAX = 255

/** El largo del objeto del reclamo o del amparo (V3 D-27). Lo usa también el contador del campo. */
export const SUBJECT_MATTER_MAX = 800

/**
 * Topes de los controles (`maxLength`), por campo del formulario: no dejan
 * escribir de más. Salen de las mismas constantes que valida el schema.
 */
export const CASE_MAX_LENGTH = {
    /* Exactamente 8 dígitos. */
    sacNumber: 8,
    caption: CAPTION_MAX,
    court: COURT_MAX,
    instructorName: INSTRUCTOR_MAX,
    tribunalPhone: PHONE_MAX,
    instructorExtension: EXTENSION_MAX,
    counterparty: COUNTERPARTY_MAX,
    subjectMatter: SUBJECT_MATTER_MAX,
    /* V5 no fija tope de días del amparo: tres dígitos alcanzan (decisión del equipo, 06/11/2026). */
    harmfulActTermDays: 3,
    harmfulActRenewalDays: 3,
} as const

export function validateCase(values: CaseFormValues): CaseFormErrors {
    const errors: CaseFormErrors = {}
    const criminal = values.jurisdiction === 'CRIMINAL'
    const today = todayIsoDate()

    /* El SAC es opcional (D-33). Si se informa, son 8 dígitos; que además no
    esté repetido lo resuelve el backend, con un 409 que la pantalla pinta en
    este mismo campo. */
    const sac = values.sacNumber.trim()
    if (sac && !SAC_PATTERN.test(sac)) {
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
    if (values.tribunalPhone.trim().length > PHONE_MAX) {
        errors.tribunalPhone = `Puede tener hasta ${PHONE_MAX} caracteres.`
    }
    if (values.instructorExtension.trim().length > EXTENSION_MAX) {
        errors.instructorExtension = `Puede tener hasta ${EXTENSION_MAX} caracteres.`
    }


    if (!values.clientId) {
        errors.clientId = 'Elegí el cliente de la causa.'
    }

    // El formulario ya resetea el rol al cambiar de fuero; esto cubre el caso
    // en que igual quedó uno que el fuero no admite.
    if (!PROCEDURAL_ROLES_BY_JURISDICTION[values.jurisdiction].includes(values.proceduralRole)) {
        errors.proceduralRole = 'Ese rol procesal no corresponde al fuero.'
    }

        if (criminal) {
        /* Las calificaciones son opcionales (D-33), pero la fecha del hecho es obligatoria en cada una de las elegidas (D-28): sin ella no hay desde
           cuándo computar la prescripción. */
        const offenseDates: Record<number, string> = {}
        for (const q of values.legalQualifications) {
            if (!q.offenseDate) {
                offenseDates[q.legalQualificationId] = 'Cargá la fecha del hecho.'
            } else if (!parseDateOnly(q.offenseDate)) {
                offenseDates[q.legalQualificationId] = 'La fecha del hecho no es válida.'
            } else if (q.offenseDate > today) {
                // Las dos son `YYYY-MM-DD`, así que se comparan como texto.
                offenseDates[q.legalQualificationId] = 'No puede ser posterior a hoy.'
            }
        }
        if (Object.keys(offenseDates).length > 0) {
            errors.offenseDates = offenseDates
            errors.legalQualifications = 'Revisá la fecha del hecho de cada calificación.'
        }
    } else {
        if (values.counterparty.trim().length > COUNTERPARTY_MAX) {
            errors.counterparty = `Puede tener hasta ${COUNTERPARTY_MAX} caracteres.`
        }

        // Obligatorio en administrativo y amparo (V3 D-27).
        const subject = values.subjectMatter.trim()
        if (!subject) {
            errors.subjectMatter = values.jurisdiction === 'AMPARO'
                ? 'El objeto del amparo es obligatorio.'
                : 'El objeto del reclamo es obligatorio.'
        } else if (subject.length > SUBJECT_MATTER_MAX) {
            errors.subjectMatter = `Puede tener hasta ${SUBJECT_MATTER_MAX} caracteres.`
        }
    }

    if (values.jurisdiction === 'AMPARO') {
        Object.assign(errors, validateHarmfulAct(values, today))
    }

    // Agotamiento de la vía administrativa: opcional y no futura (V4 D-67).
    const exhaustedOn = values.administrativeRemedyExhaustedOn.trim()
    if (values.jurisdiction === 'ADMINISTRATIVE' && exhaustedOn) {
        if (!parseDateOnly(exhaustedOn)) {
            errors.administrativeRemedyExhaustedOn = 'La fecha no es válida.'
        } else if (exhaustedOn > today) {
            errors.administrativeRemedyExhaustedOn = 'No puede ser posterior a hoy.'
        }
    }

    if (!values.responsibleLawyerId) {
        errors.responsibleLawyerId = 'Elegí el abogado responsable.'
    }

    /* La fecha de inicio va con el SAC (CA-18.2): obligatoria si se informa, y
       sin él no se carga. El formulario ya la vacía al borrar el SAC; esto
       cubre el caso en que igual quedó una. */
    const startDate = values.startDate.trim()
    if (sac && !startDate) {
        errors.startDate = 'Cargá la fecha de inicio: es obligatoria con N° de SAC.'
    } else if (!sac && startDate) {
        errors.startDate = 'Sin N° de SAC no se carga la fecha de inicio.'
    } else if (startDate && !parseDateOnly(startDate)) {
        errors.startDate = 'La fecha de inicio no es válida.'
    } else if (startDate && startDate > today) {
        errors.startDate = 'La fecha de inicio no puede ser posterior a hoy.'
    }

    return errors
}

/**
 * El acto lesivo del amparo (V4 D-67, D-78). Todo es opcional, pero si se
 * carga la fecha hacen falta el plazo para presentar el amparo y cómo se
 * cuentan sus días; y si el acto se renueva, cada cuántos días.
 */
function validateHarmfulAct(values: CaseFormValues, today: string): CaseFormErrors {
    const errors: CaseFormErrors = {}
    const date = values.harmfulActDate.trim()
    if (!date) return errors

    if (!parseDateOnly(date)) {
        errors.harmfulActDate = 'La fecha del acto lesivo no es válida.'
    } else if (date > today) {
        errors.harmfulActDate = 'No puede ser posterior a hoy.'
    }

    if (!isPositiveInteger(values.harmfulActTermDays)) {
        errors.harmfulActTermDays = 'Indicá el plazo para presentar el amparo, en días.'
    }

    if (values.harmfulActRenews && !isPositiveInteger(values.harmfulActRenewalDays)) {
        errors.harmfulActRenewalDays = 'Indicá cada cuántos días se renueva el acto lesivo.'
    }

    return errors
}

/** Un entero mayor o igual a 1, escrito como texto. */
function isPositiveInteger(text: string): boolean {
    const value = text.trim()
    return /^\d+$/.test(value) && Number(value) >= 1
}

/** `true` si no hay ningún error. Evita repetir el `Object.keys` en la pantalla. */
export function isValid(errors: CaseFormErrors): boolean {
    return Object.keys(errors).length === 0
}
