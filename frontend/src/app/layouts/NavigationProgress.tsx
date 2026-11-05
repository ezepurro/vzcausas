import { useEffect, useState } from 'react'
import { useNavigation } from 'react-router'

/** Cuánto tiene que tardar una navegación para que se muestre la barra. */
export const NAVIGATION_PROGRESS_DELAY_MS = 150

/**
 * Barra fina bajo la barra superior mientras se descarga la pantalla a la que
 * se navega (`lazy`, ver `pages.ts`). Sin ella, con una conexión lenta el
 * click en el rail parece no hacer nada: la pantalla anterior queda quieta.
 *
 * - La app no tiene `loader`s, así que `navigation.state` es `'loading'` sólo
 *   mientras llega el archivo de una pantalla. Los pedidos de datos siguen
 *   con sus esqueletos.
 * - Aparece recién a los 150 ms: si la pantalla ya estaba descargada (o se
 *   adelantó al apuntar al ítem), no hay parpadeo.
 *
 * Va dentro de `.vz-topbar`, que es `sticky` y le sirve de referencia.
 */
export function NavigationProgress() {
    const loading = useNavigation().state === 'loading'
    const [visible, setVisible] = useState(false)

    useEffect(() => {
        if (!loading) return
        const timer = setTimeout(() => setVisible(true), NAVIGATION_PROGRESS_DELAY_MS)
        return () => {
            clearTimeout(timer)
            setVisible(false)
        }
    }, [loading])

    if (!visible) return null
    return <div className="vz-nav-progress" role="progressbar" aria-label="Cargando la pantalla" />
}
