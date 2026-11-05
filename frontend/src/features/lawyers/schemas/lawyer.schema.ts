/**
 * Validación del formulario de abogado.
 * El backend las vuelve a verificar: validar acá es para no gastar un viaje al servidor y para decir
 * qué campo está mal, no para reemplazarlo.
 */

import type { LawyerFormValues } from '@/features/lawyers/types/lawyer'

export type LawyerFormErrors = Partial<Record<keyof LawyerFormValues, string>>

/* Matrícula del Colegio de Abogados de Córdoba: circunscripción y número
   separados por guión, `1-28114`. Acepta uno o dos dígitos de
   circunscripción: una expresión de más rechaza matrículas legítimas. */
const REGISTRATION_PATTERN = /^\d{1,2}-\d{5}$/

/* Apellido y nombres, cada uno hasta 100 caracteres (V4 §3.3, D-68). */
const NAME_MAX = 100

/**
 * El alta y la edición validan lo mismo: son los tres únicos campos que el
 * estudio carga. Por eso no recibe contexto de modo.
 */
export function validateLawyer(values: LawyerFormValues): LawyerFormErrors {
    const errors: LawyerFormErrors = {}

    const lastName = values.lastName.trim()
    if (!lastName) {
        errors.lastName = 'El apellido es obligatorio.'
    } else if (lastName.length > NAME_MAX) {
        errors.lastName = `Puede tener hasta ${NAME_MAX} caracteres.`
    }

    const firstName = values.firstName.trim()
    if (!firstName) {
        errors.firstName = 'Los nombres son obligatorios.'
    } else if (firstName.length > NAME_MAX) {
        errors.firstName = `Puede tener hasta ${NAME_MAX} caracteres.`
    }

    /* Opcional: vacía está bien, y sólo se valida el formato si viene. */
    const registrationNumber = values.registrationNumber.trim()
    if (registrationNumber && !REGISTRATION_PATTERN.test(registrationNumber)) {
        errors.registrationNumber = 'El formato es circunscripción y número: 1-28114.'
    }

    return errors
}

/** `true` si no hay ningún error. Evita repetir el `Object.keys` en la pantalla. */
export function isValid(errors: LawyerFormErrors): boolean {
    return Object.keys(errors).length === 0
}
