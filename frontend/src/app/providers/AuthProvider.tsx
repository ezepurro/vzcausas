import { useCallback, useEffect, useMemo, useRef, useState, type ReactNode } from 'react'
import { queryClient } from '@/shared/api/queryClient'
import {
    renewSessionNow,
    setForbiddenHandler,
    setRenewHandler,
    setUnauthenticatedHandler,
} from '@/shared/api/http'
import { isApiError } from '@/shared/api/ApiError'
import { clearDrafts } from '@/shared/lib/drafts'
import {
    clearStoredSession,
    isAccessTokenExpired,
    isSessionStorageKey,
    readStoredSession,
    writeRefreshedSession,
    writeStoredSession,
    writeStoredUser,
} from '@/features/auth/utils/sessionStorage'
import { withRenewalLock } from '@/features/auth/utils/renewalLock'
import { getSessionLawyer, refreshSession } from '@/features/auth/api/auth.api'
import type { AuthUser, Session, StoredSession } from '@/features/auth/types/session'
import { AuthContext, type AuthValue, type SignOutReason } from './AuthContext'
import { BootScreen } from '@/app/layouts/BootScreen'

type Props = {
    children: ReactNode
}

/**
 * Sostiene la sesión mientras la aplicación está abierta.
 *
 * Arranca leyendo lo que haya quedado guardado, así una recarga de página no
 * saca a nadie. Si no hay nada, arranca sin sesión y la guarda del router
 * manda al login. Si el token de acceso guardado venció, la verificación de
 * abajo lo renueva con la cookie; sólo si la renovación responde 401 se
 * vuelve al login.
 */
export function AuthProvider({ children }: Props) {
    /* La función va como inicializador perezoso: si se pasara
       `readStoredSession()` a secas, se leería el almacenamiento en cada
       render y no sólo en el primero. */
    const [session, setSession] = useState<StoredSession | null>(readStoredSession)

    /* Si la última salida fue a pedido de la persona.
       Se actualiza siempre **junto** con `session` y antes que ella: React
       agrupa las dos en un solo render, así que `RequireSession` ve el motivo
       en el mismo render en que la sesión pasa a nulo. Aunque no las agrupara,
       el orden alcanza: el motivo llegaría primero. */
    const [leftOnPurpose, setLeftOnPurpose] = useState(false)

    /* Si se está verificando la sesión guardada al abrir la aplicación (ver el
       efecto de más abajo). Sin sesión guardada no hay nada que verificar. */
    const [verifying, setVerifying] = useState(() => session !== null)

    const signIn = useCallback((incoming: Session) => {
        setLeftOnPurpose(false)
        setSession(writeStoredSession(incoming))
    }, [])

    /* Por qué falló la última renovación. Lo lee `syncSession`. */
    const lastFailure = useRef<'unauthenticated' | 'unreachable'>('unreachable')

    /* La ficha que se está completando después de una renovación, si hay una. */
    const lawyerLoad = useRef<Promise<void> | null>(null)

    /* Si el proveedor sigue montado. Un pedido que vuelve después de
       desmontarlo no toca la sesión guardada: `localStorage` es de todos, y
       para entonces puede ser la de otro. En la aplicación el proveedor no se
       desmonta (en `StrictMode`, el efecto lo vuelve a poner en `true` antes de
       que vuelva ningún pedido); en los tests, un test que se corta por tiempo
       con una renovación en vuelo le cerraba la sesión al siguiente (H-55). */
    const alive = useRef(true)
    useEffect(() => {
        alive.current = true
        return () => {
            alive.current = false
        }
    }, [])

    /**
     * Completa la ficha profesional de la sesión con `GET /lawyers/{id}`.
     *
     * Si no se puede, la sesión queda sin ficha: lo seguro es no dar a nadie
     * por responsable de causas. La próxima renovación lo vuelve a intentar.
     */
    const completeLawyer = useCallback(async (lawyerId: number): Promise<void> => {
        try {
            const lawyer = await getSessionLawyer(lawyerId)
            if (!alive.current) return
            const current = readStoredSession()
            if (current === null || current.user.lawyer !== null) return
            setSession(writeStoredUser(current, { ...current.user, lawyer }))
        } catch {
            /* Queda sin ficha. */
        }
    }, [])

    const signOut = useCallback((reason: SignOutReason = 'expired') => {
        setLeftOnPurpose(reason === 'user')
        clearStoredSession()
        setSession(null)

        /* Los borradores de formularios se van sólo si la persona pidió salir.
           A quien lo echó un token vencido se le conservan: vuelve a entrar y
           recupera lo que estaba cargando. Cada uno lleva el id del usuario,
           así que otro que entre en la misma pestaña no los ve. */
        if (reason === 'user') clearDrafts()

        /* La caché entera pertenece a la sesión: lo que se trajo con un
           usuario no tiene por qué verlo el siguiente. Se limpia acá y no en
           `useLogout` porque hay más de una forma de salir —cerrar sesión a
           mano, un 401 en cualquier pantalla, una sesión vencida al
           rehidratar— y todas pasan por este punto. */
        queryClient.clear()
    }, [])

    /**
     * Llama a `POST /auth/refresh` y guarda el token nuevo sobre `current`.
     * Devuelve si lo consiguió; si no, deja anotado por qué en `lastFailure`.
     */
    const refreshStoredSession = useCallback(async (current: StoredSession): Promise<boolean> => {
        try {
            const refreshed = await refreshSession()
            if (!alive.current) return false
            const updated = writeRefreshedSession(current, refreshed)
            if (updated === null) {
                lastFailure.current = 'unauthenticated'
                return false
            }

            setSession(updated)

            /* Le vincularon otra ficha: la renovación trae sólo el id. Se
               completa **sin esperarla**: esta función es la renovación en
               curso de `http.ts`, y si el pedido de la ficha volviera con un
               401 esperaría a esta misma renovación, que lo estaría esperando
               a él. */
            const { lawyerId } = refreshed.user
            if (lawyerId !== null && updated.user.lawyer === null) {
                lawyerLoad.current = completeLawyer(lawyerId)
            }
            return true
        } catch (error) {
            /* No hay token nuevo. Se anota por qué, porque al abrir la
               aplicación no es lo mismo una sesión terminada que un servidor
               que no responde. Por un `401` en otra pantalla, `http.ts` cierra
               la sesión en los dos casos. */
            lastFailure.current =
                isApiError(error) && error.is('UNAUTHENTICATED') ? 'unauthenticated' : 'unreachable'
            return false
        }
    }, [completeLawyer])

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
     *
     * Corre adentro de `withRenewalLock`: una sola pestaña renueva por vez.
     * La que esperó, al entrar, mira si la otra ya dejó un token nuevo y
     * vigente; si es así lo usa y no llama al backend, porque la cookie que
     * tiene ya fue rotada y presentarla de nuevo revocaría la sesión.
     */
    const renew = useCallback(async (): Promise<boolean> => {
        const before = readStoredSession()
        if (before === null) return false

        return withRenewalLock(async () => {
            const current = readStoredSession()
            if (current === null) {
                /* Otra pestaña intentó renovar mientras esta esperaba, no
                   pudo y borró la sesión: terminó para todas. */
                lastFailure.current = 'unauthenticated'
                return false
            }

            if (current.accessToken !== before.accessToken && !isAccessTokenExpired(current)) {
                setSession(current)
                return true
            }

            return refreshStoredSession(current)
        })
    }, [refreshStoredSession])

    const syncSession = useCallback(async (): Promise<StoredSession | null> => {
        if (readStoredSession() === null) return null

        const renewed = await renewSessionNow()
        if (!alive.current) return null

        if (!renewed) {
            if (lastFailure.current === 'unauthenticated') {
                signOut('expired')
                return null
            }
            // Sin red: se sigue con lo guardado.
            return readStoredSession()
        }

        await lawyerLoad.current
        if (!alive.current) return null

        /* La renovación ya actualizó la sesión del proveedor que la hizo. Se
           vuelve a leer igual: si se sumó a una renovación en curso, la hizo
           otro. */
        const fresh = readStoredSession()
        setSession(fresh)
        return fresh
    }, [signOut])

    const updateCurrentUser = useCallback((user: Omit<AuthUser, 'lastLoginAt'>): StoredSession | null => {
        const current = readStoredSession()
        if (current === null || current.user.id !== user.id) return null

        const updated = writeStoredUser(current, { ...user, lastLoginAt: current.user.lastLoginAt })
        setSession(updated)
        return updated
    }, [])

    /* La verificación que disparó un 403, mientras dura. */
    const forbiddenSync = useRef<Promise<unknown> | null>(null)

    /**
     * Un `403` puede querer decir que a la persona le sacaron un rol con la
     * sesión abierta: se traen los roles actuales, y el rail y las rutas se
     * acomodan solos. Si una pantalla dispara varios pedidos y vuelven todos
     * con `403`, se verifica una sola vez: los que llegan mientras tanto no
     * lanzan otra.
     *
     * El contrato usa el mismo `FORBIDDEN` para "no tenés el rol" y para "no
     * sos el abogado responsable" (D-30), así que a veces se verifica de más.
     * Es un pedido, no un problema.
     */
    const syncAfterForbidden = useCallback(() => {
        if (forbiddenSync.current !== null) return
        forbiddenSync.current = syncSession().finally(() => {
            forbiddenSync.current = null
        })
    }, [syncSession])

    /**
     * Un token vencido o un permiso que ya no se tiene pueden aparecer en
     * cualquier pantalla, no sólo al entrar. Estos avisos le dicen al cliente
     * HTTP qué hacer: ante un `401`, primero intentar renovar y, si no se
     * puede, cerrar la sesión; ante un `403`, traer los roles actuales. La
     * guarda del router hace el resto: nadie se queda mirando errores que no
     * puede resolver.
     */
    useEffect(() => {
        setUnauthenticatedHandler(signOut)
        setRenewHandler(renew)
        setForbiddenHandler(syncAfterForbidden)
        return () => {
            setUnauthenticatedHandler(null)
            setRenewHandler(null)
            setForbiddenHandler(null)
        }
    }, [signOut, renew, syncAfterForbidden])

    /* La sesión que está dibujada, para compararla con lo que cambie afuera
       sin rearmar el oyente de abajo en cada render. */
    const sessionRef = useRef(session)
    useEffect(() => {
        sessionRef.current = session
    }, [session])

    /**
     * La sesión se guarda en `localStorage`, que comparten todas las pestañas,
     * y el cliente HTTP lee el token de ahí en cada pedido. Sin este oyente,
     * lo que pasaba en otra pestaña no llegaba a ésta: cerrar sesión allá
     * dejaba acá la pantalla y los datos a la vista, y si allá entraba otra
     * persona, esta pestaña seguía mostrando a la primera mientras pedía con
     * el token de la segunda (H-01 de `docs/auditoria-front`).
     *
     * El evento `storage` llega sólo a las *otras* pestañas, así que acá
     * nunca se atiende un cambio propio.
     */
    useEffect(() => {
        function onStorage(event: StorageEvent) {
            if (event.storageArea !== localStorage || !isSessionStorageKey(event.key)) return

            const stored = readStoredSession()
            const current = sessionRef.current

            if (stored === null) {
                if (current === null) return
                /* Salieron en otra pestaña. No se sabe quién va a entrar
                   después: como al salir a mano, no se recuerda la pantalla
                   y no queda nada de esta sesión en la caché. Los borradores
                   se conservan: llevan el id de su usuario. */
                setLeftOnPurpose(true)
                setSession(null)
                queryClient.clear()
                return
            }

            /* Entró otra persona: lo que hay en la caché es de la anterior. */
            if (current !== null && current.user.id !== stored.user.id) queryClient.clear()

            setLeftOnPurpose(false)
            setSession(stored)
        }

        window.addEventListener('storage', onStorage)
        return () => window.removeEventListener('storage', onStorage)
    }, [])

    /**
     * Al abrir la aplicación con una sesión guardada, sus roles pueden estar
     * viejos: se guardaron en el login. Se piden los actuales antes de mostrar
     * nada, así un F5 alcanza para ver el perfil nuevo y nadie ve, ni por un
     * instante, pantallas que ya no le corresponden.
     *
     * Va después del efecto de arriba a propósito: `syncSession` renueva a
     * través de `http.ts`, que necesita el handler ya registrado. En
     * `StrictMode` el efecto corre dos veces; la segunda se suma a la
     * renovación en curso y no lanza otra.
     */
    useEffect(() => {
        if (!verifying) return
        let active = true
        void syncSession().finally(() => {
            if (active) setVerifying(false)
        })
        return () => {
            active = false
        }
        // Sólo al montarse: después, la sesión se mantiene al día sola.
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [])

    const value = useMemo<AuthValue>(
        () => ({ session, signIn, signOut, leftOnPurpose, syncSession, updateCurrentUser }),
        [session, signIn, signOut, leftOnPurpose, syncSession, updateCurrentUser],
    )

    return (
        <AuthContext.Provider value={value}>
            {verifying ? <SessionCheck /> : children}
        </AuthContext.Provider>
    )
}

/**
 * Lo que se ve mientras se verifica la sesión al abrir la aplicación. Dura lo
 * que tarda una renovación. Es la pantalla de carga de siempre (`BootScreen`),
 * la misma que ya estaba a la vista desde `index.html`: sólo cambia el texto.
 */
function SessionCheck() {
    return <BootScreen label="Verificando la sesión" />
}
