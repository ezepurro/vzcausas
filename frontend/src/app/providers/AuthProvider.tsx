import { useCallback, useEffect, useMemo, useState, type ReactNode } from 'react'
import { queryClient } from '@/shared/api/queryClient'
import { setRenewHandler, setUnauthenticatedHandler } from '@/shared/api/http'
import {
    clearStoredSession,
    readStoredSession,
    writeRefreshedSession,
    writeStoredSession,
} from '@/features/auth/utils/sessionStorage'
import { refreshSession } from '@/features/auth/api/auth.api'
import type { Session, StoredSession } from '@/features/auth/types/session'
import { AuthContext, type AuthValue } from './AuthContext'

type Props = {
    children: ReactNode
}

/**
 * Sostiene la sesión mientras la aplicación está abierta.
 *
 * Arranca leyendo lo que haya quedado guardado, así una recarga de página no
 * saca a nadie. Si no hay nada, o lo que hay venció, arranca sin sesión y la
 * guarda del router manda al login.
 */
export function AuthProvider({ children }: Props) {
    /* La función va como inicializador perezoso: si se pasara
       `readStoredSession()` a secas, se leería el almacenamiento en cada
       render y no sólo en el primero. */
    const [session, setSession] = useState<StoredSession | null>(readStoredSession)

    const signIn = useCallback((incoming: Session) => {
        setSession(writeStoredSession(incoming))
    }, [])

    const signOut = useCallback(() => {
        clearStoredSession()
        setSession(null)

        /* La caché entera pertenece a la sesión: lo que se trajo con un
           usuario no tiene por qué verlo el siguiente. Se limpia acá y no en
           `useLogout` porque hay más de una forma de salir —cerrar sesión a
           mano, un 401 en cualquier pantalla, una sesión vencida al
           rehidratar— y todas pasan por este punto. */
        queryClient.clear()
    }, [])

    /**
     * Consigue un token de acceso nuevo sin molestar al usuario.
     *
     * El token dura quince minutos; la cookie de renovación, siete días. Sin
     * esto, una jornada de trabajo serían treinta vueltas al login.
     *
     * La sesión se lee del almacenamiento y no del estado a propósito: así la
     * función no depende de ningún render y nunca trabaja sobre una versión
     * vieja. Devuelve si lo consiguió; el que decide qué hacer con la
     * respuesta es `http.ts`.
     */
    const renew = useCallback(async (): Promise<boolean> => {
        const current = readStoredSession()
        if (current === null) return false

        try {
            const refreshed = await refreshSession()
            const updated = writeRefreshedSession(current, refreshed)
            if (updated === null) return false

            setSession(updated)
            return true
        } catch {
            /* La cookie venció, fue revocada, o no hay red. No se distingue:
               en los tres casos no hay token nuevo, y `http.ts` se encarga de
               cerrar la sesión. */
            return false
        }
    }, [])

    /**
     * Un token vencido puede aparecer en cualquier pantalla, no sólo al
     * entrar. Estos dos avisos le dicen al cliente HTTP qué hacer: primero
     * intentar renovar y, si no se puede, cerrar la sesión. La guarda del
     * router hace el resto: nadie se queda mirando errores que no puede
     * resolver.
     */
    useEffect(() => {
        setUnauthenticatedHandler(signOut)
        setRenewHandler(renew)
        return () => {
            setUnauthenticatedHandler(null)
            setRenewHandler(null)
        }
    }, [signOut, renew])

    const value = useMemo<AuthValue>(
        () => ({ session, signIn, signOut }),
        [session, signIn, signOut],
    )

    return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}
