/**
 * Cómo se muestra una persona del sistema: usuario, abogado o quien registró
 * un acto.
 *
 * Desde V4 toda persona trae el apellido y los nombres en campos separados
 * (D-68), igual que el cliente desde V3. Vive en `shared/lib` porque la usan
 * varios módulos —usuarios, abogados, causas, actos— y tiene que leerse igual
 * en todos lados. El cliente tiene su propio formato (`formatClientName`, con
 * el apellido en mayúsculas), porque así lo carga el estudio.
 *
 * El tratamiento ("Dr.", "Dra.") ya no forma parte del nombre (D-81): el
 * contrato no dice si corresponde uno u otro, así que acá no se agrega.
 */

export interface PersonName {
    lastName: string
    firstName: string
}

/**
 * `Ríos, Malena`: apellido primero, para tablas y selects, donde una persona
 * se busca por apellido (observación de la Sprint Review 1).
 */
export function formatPersonName(person: PersonName): string {
    const lastName = person.lastName.trim()
    const firstName = person.firstName.trim()
    if (!lastName) return firstName
    if (!firstName) return lastName
    return `${lastName}, ${firstName}`
}

/** `Malena Ríos`: nombres primero, para cuando la persona aparece dentro de una frase. */
export function formatPersonFullName(person: PersonName): string {
    return [person.firstName.trim(), person.lastName.trim()].filter(Boolean).join(' ')
}
