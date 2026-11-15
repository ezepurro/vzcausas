/**
 * Qué le pasa al usuario vinculado cuando se da de baja la ficha (CA-15.5,
 * D-133). La baja no se bloquea: el usuario pierde el perfil Abogado, y si era
 * el único se da de baja también.
 *
 * El ejemplo de V6 ("El usuario iperalta también queda dado de baja") vale
 * solo para el segundo caso.
 */

import type { LinkedUser } from '@/features/lawyers/types/lawyerDeletion'

export function linkedUserNotice(user: LinkedUser | null): string | null {
    if (user === null) return null
    const others = user.roles.filter((role) => role !== 'LAWYER')
    if (others.length === 0) {
        return `El usuario ${user.username} también queda dado de baja: Abogado era su único perfil.`
    }
    return `El usuario ${user.username} pierde el perfil Abogado y sigue con sus otros perfiles.`
}
