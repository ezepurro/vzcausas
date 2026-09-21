import { useCallback, useEffect, useMemo, useState, type ReactNode } from 'react'
import { queryClient } from '@/shared/api/queryClient'
import { setUnauthenticatedHandler } from '@/shared/api/http'
import {
    clearStoredSession,
    readStoredSession,
    writeStoredSession,
} from '@/features/auth/utils/sessionStorage'
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
     * Un token vencido o revocado puede aparecer en cualquier pantalla, no
     * sólo al entrar. Cuando el servidor lo rechaza, la sesión se cierra sola
     * y la guarda del router manda al login: nadie se queda mirando errores
     * que no puede resolver.
     *
     * Como no hay renovación de token en el contrato, no hay nada que
     * reintentar; volver a entrar es la única salida.
     */
    useEffect(() => {
        setUnauthenticatedHandler(signOut)
        return () => setUnauthenticatedHandler(null)
    }, [signOut])

    const value = useMemo<AuthValue>(
        () => ({ session, signIn, signOut }),
        [session, signIn, signOut],
    )

    return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}
