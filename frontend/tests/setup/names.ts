/**
 * El nombre de una persona tal como puede mostrarlo la pantalla (V4 D-68,
 * D-81). El contrato manda `lastName` y `firstName` separados y deja el
 * tratamiento ("Dr.", "Dra.") al frontend, pero no fija el formato: estos
 * tests aceptan "Apellido, Nombres" y "Nombres Apellido", con o sin
 * tratamiento delante. Así no fijan una decisión que el equipo no tomó.
 *
 * Con `exact` (por defecto) el texto tiene que ser sólo el nombre, para
 * celdas y opciones; sin él, el nombre puede estar dentro de una frase.
 */
export function personName(lastName: string, firstName: string, { exact = true } = {}): RegExp {
    const last = escape(lastName)
    const first = escape(firstName)
    const name = `(?:(?:Dra?\\.\\s)?${first}\\s${last}|${last},\\s${first})`
    return new RegExp(exact ? `^${name}$` : name)
}

/** El mismo nombre dentro de una frase: `personName` sin `exact`. */
export function personNameIn(lastName: string, firstName: string): string {
    return personName(lastName, firstName, { exact: false }).source
}

function escape(text: string): string {
    return text.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
}
