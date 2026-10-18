/**
 * Del formulario al cuerpo del `PATCH /users/{id}`: **sólo lo que cambió**.
 *
 * El contrato responde 400 a un PATCH vacío, así que si no cambió nada la
 * página ni siquiera tiene que llamar: para eso está `hasChanges`.
 */

import type {
    Role,
    UpdateUserBody,
    User,
    UserFormValues,
} from '@/features/users/types/user'
import { needsLawyer } from '@/features/users/utils/lawyerLink'


export function buildUserPatch(
    original: User,
    values: UserFormValues,
    roles: Role[],
): UpdateUserBody {
    const patch: UpdateUserBody = {}

    /* Se recorta ANTES de comparar: '  jperez ' y 'jperez' son el mismo
       usuario, y mandar un PATCH por un espacio sería absurdo. */
    const username = values.username.trim()
    if (username !== original.username) patch.username = username

    const lastName = values.lastName.trim()
    if (lastName !== original.lastName) patch.lastName = lastName

    const firstName = values.firstName.trim()
    if (firstName !== original.firstName) patch.firstName = firstName

    const email = values.email.trim()
    if (email !== original.email) patch.email = email

    /* Si el conjunto no cambió, `roles` no viaja y el backend no lo toca:
        ahí está la garantía de que un usuario con dos roles no pierde uno.
        El contrato es explícito en que `roles` reemplaza el conjunto
        completo, así que mandarlo a medias sería perder los demás. */
    if (!sameRoles(original.roles, roles)) patch.roles = roles
    
    const lawyerId = nextLawyerId(values, roles)
    if (lawyerId !== (original.lawyer?.id ?? null)) patch.lawyerId = lawyerId

    return patch
}
function sameRoles(a: Role[], b: Role[]): boolean {
    return a.length === b.length && a.every((role) => b.includes(role))
}
/**
 * Con qué ficha queda el usuario: un id, o `null` para desvincular.
 *
 * Pregunta por el conjunto que va a quedar, no por el perfil del select. Si
 * alguien era Administrador y Abogado y pasa a Secretaría, sigue teniendo
 * `LAWYER` y la ficha tiene que quedarse: mirar sólo el select la
 * desvincularía y el backend respondería 422.
 */
function nextLawyerId(values: UserFormValues, roles: Role[]): number | null {
    if (!needsLawyer(roles)) return null
    const id = values.lawyerId.trim()
    return id ? Number(id) : null
}

/** `true` si hay algo para mandar. */
export function hasChanges(patch: UpdateUserBody): boolean {
    return Object.keys(patch).length > 0
}
