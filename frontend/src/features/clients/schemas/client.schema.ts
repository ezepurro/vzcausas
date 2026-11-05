/**
 * Validación del formulario de cliente.
 * El backend las vuelve a verificar: validar acá es para no gastar un viaje al
 * servidor y para decir qué campo está mal, no para reemplazarlo.
 *
 * Los límites son los del cuerpo de `POST /clients` (V3 §3.6).
 */

import { DOCUMENT_TYPES, type ClientFormValues } from '@/features/clients/types/client'
import { normalizeDocumentNumber } from '@/features/clients/utils/clientFormat'

export type ClientFormErrors = Partial<Record<keyof ClientFormValues, string>>

const NAME_MAX = 100
const PHONE_MAX = 50
const ADDRESS_MAX = 255

/** 7 u 8 dígitos, después de sacarle los puntos. */
const DNI_PATTERN = /^\d{7,8}$/

/* Letras y números, de 6 a 20, después de sacarle los espacios. Los
   pasaportes extranjeros no siguen un formato único: la validación de verdad
   la hace el backend. */
const PASSPORT_PATTERN = /^[A-Z0-9]{6,20}$/

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

    const documentType = values.documentType
    const documentNumber = normalizeDocumentNumber(documentType, values.documentNumber)
    if (!(DOCUMENT_TYPES as readonly string[]).includes(documentType)) {
        errors.documentType = 'Elegí el tipo de documento.'
    } else if (!documentNumber) {
        errors.documentNumber = 'El número de documento es obligatorio.'
    } else if (documentType === 'DNI' && !DNI_PATTERN.test(documentNumber)) {
        errors.documentNumber = 'El DNI tiene 7 u 8 números.'
    } else if (documentType === 'PASSPORT' && !PASSPORT_PATTERN.test(documentNumber)) {
        errors.documentNumber = 'El pasaporte tiene de 6 a 20 letras y números.'
    }

    // Opcionales: vacíos están bien, y sólo se validan si vienen.
    if (values.address.trim().length > ADDRESS_MAX) {
        errors.address = `Puede tener hasta ${ADDRESS_MAX} caracteres.`
    }

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
