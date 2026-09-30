/**
 * Validación del formulario de cliente.
 * El backend las vuelve a verificar: validar acá es para no gastar un viaje al
 * servidor y para decir qué campo está mal, no para reemplazarlo.
 *
 * Los límites son los del cuerpo de `POST /clients` (V3 §3.6).
 */

import type { ClientFormValues } from '@/features/clients/types/client'
import { normalizeDni } from '@/features/clients/utils/clientFormat'

export type ClientFormErrors = Partial<Record<keyof ClientFormValues, string>>

const NAME_MAX = 100
const PHONE_MAX = 50

/** 7 u 8 dígitos, después de sacarle los puntos. */
const DNI_PATTERN = /^\d{7,8}$/

/* Un punto, una arroba y algo después, como en usuarios: la validación de
   verdad la hace el backend. */
const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/

export function validateClient(values: ClientFormValues): ClientFormErrors {
    const errors: ClientFormErrors = {}

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

    const dni = normalizeDni(values.dni.trim())
    if (!dni) {
        errors.dni = 'El DNI es obligatorio.'
    } else if (!DNI_PATTERN.test(dni)) {
        errors.dni = 'El DNI tiene 7 u 8 números.'
    }

    // Opcionales: vacíos están bien, y sólo se validan si vienen.
    if (values.phone.trim().length > PHONE_MAX) {
        errors.phone = `Puede tener hasta ${PHONE_MAX} caracteres.`
    }

    const email = values.email.trim()
    if (email && !EMAIL_PATTERN.test(email)) {
        errors.email = 'El formato del correo electrónico no es válido.'
    }

    return errors
}

/** `true` si no hay ningún error. Evita repetir el `Object.keys` en la pantalla. */
export function isValid(errors: ClientFormErrors): boolean {
    return Object.keys(errors).length === 0
}
