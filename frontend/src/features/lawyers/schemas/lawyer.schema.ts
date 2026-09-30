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

/**
 * El alta y la edición validan lo mismo: son los dos únicos campos que el
 * estudio carga. Por eso no recibe contexto de modo.
 */
export function validateLawyer(values: LawyerFormValues): LawyerFormErrors {
    const errors: LawyerFormErrors = {}

    if (!values.fullName.trim()) {
        errors.fullName = 'El apellido y nombre es obligatorio.'
    }

    const registrationNumber = values.registrationNumber.trim()
    if (!registrationNumber) {
        errors.registrationNumber = 'La matrícula es obligatoria.'
    } else if (!REGISTRATION_PATTERN.test(registrationNumber)) {
        errors.registrationNumber = 'El formato es circunscripción y número: 1-28114.'
    }

    return errors
}

/** `true` si no hay ningún error. Evita repetir el `Object.keys` en la pantalla. */
export function isValid(errors: LawyerFormErrors): boolean {
    return Object.keys(errors).length === 0
}
