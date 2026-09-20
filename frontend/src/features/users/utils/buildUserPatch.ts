/**
 * Del formulario al cuerpo del `PATCH /users/{id}`: **sólo lo que cambió**.
 *
 * El contrato responde 400 a un PATCH vacío, así que si no cambió nada la
 * página ni siquiera tiene que llamar.
 */

import type {
    Role,
    UpdateUserBody,
    User,
    UserFormValues,
} from '@/features/users/types/user'
import { principalRole, withPrincipalRole } from '@/features/users/utils/roles'

export function buildUserPatch(
    original: User,
    values: UserFormValues,
    role: Role,
): UpdateUserBody {
    const patch: UpdateUserBody = {}

    /* Se recorta ANTES de comparar: '  jperez ' y 'jperez' son el mismo
       usuario, y mandar un PATCH por un espacio sería absurdo. */
    const username = values.username.trim()
    if (username !== original.username) {
        patch.username = username
    }

    /* Si el perfil no se tocó, `role` no viaja y el backend no lo toca:
       ahí está la garantía de que un usuario con dos roles no pierde uno. */
    if (role !== principalRole(original.role)) {
        patch.role = withPrincipalRole(original.role, role)
    }

    /* PENDIENTE BACKEND · hoy `original.abogadoId` siempre llega `undefined`
       porque el contrato no lo devuelve, así que cualquier valor cargado se
       considera un cambio y se manda. Cuando el backend lo publique, esta
       comparación empieza a funcionar sola. */
    const abogadoId = values.abogadoId.trim()
    if (abogadoId && abogadoId !== (original.abogadoId ?? '')) {
        patch.abogadoId = abogadoId
    }

    return patch
}

/** `true` si hay algo para mandar. */
export function hasChanges(patch: UpdateUserBody): boolean {
    return Object.keys(patch).length > 0
}
