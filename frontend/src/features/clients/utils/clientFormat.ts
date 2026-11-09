/**
 * Cómo se muestra un cliente. Vive acá y no en cada pantalla porque la misma
 * persona aparece en el listado, en el select del alta de causa, en la tarjeta
 * del detalle y en la carátula sugerida: tiene que leerse igual en todos lados.
 */

import type { Client, DocumentType } from '@/features/clients/types/client'

/** Cómo se lee cada tipo de documento en pantalla. */
export const DOCUMENT_TYPE_LABELS: Record<DocumentType, string> = {
    DNI: 'DNI',
    PASSPORT: 'Pasaporte',
}

/**
 * `GÓMEZ, Ariel Fernando`: apellido primero, porque una persona se busca por
 * apellido (observación de la Sprint Review 1). El apellido va en mayúsculas
 * como lo carga el estudio; si llegó en minúsculas, se muestra igual en
 * mayúsculas para que el listado no mezcle las dos formas.
 */
export function formatClientName(client: Pick<Client, 'lastName' | 'firstName'>): string {
    return `${client.lastName.trim().toUpperCase()}, ${client.firstName.trim()}`
}

/**
 * `34812905` → `34.812.905`. El DNI viaja sin puntos (V3 D-17); los puntos
 * son sólo de presentación. Un valor que no son 7 u 8 dígitos se devuelve tal
 * cual: mostrar lo que hay es mejor que inventar un formato.
 */
export function formatDni(dni: string): string {
    if (!/^\d{7,8}$/.test(dni)) return dni
    return dni.replace(/\B(?=(\d{3})+(?!\d))/g, '.')
}

/**
 * Lo que el usuario escribió en el campo DNI, como lo pide el contrato: sólo
 * dígitos. Acepta `34.812.905`, `34 812 905` o `34812905`.
 */
export function normalizeDni(input: string): string {
    return input.replace(/[.\s]/g, '')
}

/**
 * El número de documento como viaja: el DNI sin puntos ni espacios; el
 * pasaporte sin espacios y en mayúsculas. Un tipo desconocido sólo se recorta.
 */
export function normalizeDocumentNumber(documentType: string, input: string): string {
    if (documentType === 'DNI') return normalizeDni(input.trim())
    if (documentType === 'PASSPORT') return input.replace(/\s/g, '').toUpperCase()
    return input.trim()
}

/** Sólo el número, como se muestra: el DNI con puntos, el pasaporte tal cual. */
export function formatDocumentNumber(client: Pick<Client, 'documentType' | 'documentNumber'>): string {
    return client.documentType === 'DNI' ? formatDni(client.documentNumber) : client.documentNumber
}

/** `DNI 34.812.905` o `Pasaporte AAA123456`: el tipo y el número juntos. */
export function formatDocument(client: Pick<Client, 'documentType' | 'documentNumber'>): string {
    return `${DOCUMENT_TYPE_LABELS[client.documentType]} ${formatDocumentNumber(client)}`
}
