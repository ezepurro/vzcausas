import { useEffect, useSyncExternalStore, type CSSProperties } from 'react'
import { useNavigate, useRouteError } from 'react-router'
import { Button, Icon } from '@/shared/components/ui'
import { isChunkLoadError } from '@/app/router/chunkError'

/**
 * Lo que dibuja el router cuando una pantalla no se puede mostrar
 * (`errorElement`). Hay dos casos:
 *
 * - **No se pudo descargar la pantalla.** Cada pantalla es un archivo aparte
 *   (`pages.ts`) y se descarga al entrar por primera vez. Después de un
 *   despliegue, una pestaña abierta desde antes pide archivos que ya no
 *   existen; también falla si se corta la red justo ahí. Recargar lo arregla.
 * - **Cualquier otro error**: una excepción al dibujar la pantalla, que es un
 *   bug nuestro. El detalle va a la consola, no a la pantalla.
 *
 * **Sin conexión no se ofrece recargar**: la recarga pide la página entera,
 * el navegador muestra su propia pantalla de "sin internet" y la app ya no
 * está para guiar al usuario. El botón espera a que vuelva la red. Ojo:
 * `navigator.onLine` sabe si la computadora tiene red, no si el servidor
 * responde.
 *
 * Va en dos lugares (`index.tsx`): adentro del marco, así el rail sigue a la
 * vista y se puede ir a otra sección sin recargar (navegar limpia el error),
 * y en la raíz, a pantalla completa, para un error en los marcos o el login.
 */
export function RouteErrorPage({ fullPage = false }: { fullPage?: boolean }) {
    const error = useRouteError()
    const navigate = useNavigate()
    const online = useOnline()
    const chunk = isChunkLoadError(error)

    useEffect(() => {
        console.error(error)
    }, [error])

    const title = !online
        ? 'Sin conexión'
        : chunk
          ? 'No se pudo cargar esta pantalla'
          : 'Algo salió mal al mostrar esta pantalla'
    const text = !online
        ? 'Cuando vuelva la conexión vas a poder recargar la pantalla.'
        : chunk
          ? 'Puede haber una versión nueva de la aplicación. Recargá la página para seguir.'
          : 'Recargá la página para volver a intentarlo, o volvé al inicio.'

    const content = (
        <div className="vz-empty" role="alert">
            <Icon name="alert" size={22} />
            <div className="vz-empty__title">{title}</div>
            <div className="vz-empty__text">{text}</div>
            <div style={ACTIONS}>
                <Button variant="primary" size="md" disabled={!online} onClick={() => window.location.reload()}>
                    {online ? 'Recargar' : 'Esperando conexión…'}
                </Button>
                {/* `/` lleva a la entrada de cada usuario (`HomeRedirect`), o al login sin sesión. */}
                {!chunk && (
                    <Button variant="secondary" size="md" onClick={() => navigate('/')}>
                        Volver al inicio
                    </Button>
                )}
            </div>
        </div>
    )

    return fullPage ? <main style={FULL_PAGE}>{content}</main> : content
}

/** `navigator.onLine`, al día con los eventos `online` y `offline` del navegador. */
function useOnline(): boolean {
    return useSyncExternalStore(subscribeOnline, () => navigator.onLine)
}

function subscribeOnline(onChange: () => void) {
    window.addEventListener('online', onChange)
    window.addEventListener('offline', onChange)
    return () => {
        window.removeEventListener('online', onChange)
        window.removeEventListener('offline', onChange)
    }
}

const ACTIONS: CSSProperties = { display: 'flex', gap: 8, flexWrap: 'wrap', justifyContent: 'center', marginTop: 8 }

// Como `NotFoundLayout`: a sangre, sobre el fondo de la app.
const FULL_PAGE: CSSProperties = {
    minHeight: '100vh',
    display: 'grid',
    placeItems: 'center',
    padding: 24,
    background: 'var(--vz-canvas)',
    fontFamily: 'var(--vz-font)',
}
