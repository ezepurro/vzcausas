import { useEffect } from 'react'

/** El nombre de la aplicación: lo que dice la pestaña cuando la pantalla no puso el suyo. */
export const APP_TITLE = 'VZ Causas'

/**
 * Título de la pestaña del navegador para una pantalla: "Clientes · VZ Causas".
 *
 * Sin esto todas las pestañas se llamaban "VZ Causas" y con varias abiertas no
 * se distinguían, ni en la barra ni en el historial (H-20). Además es lo
 * primero que anuncia un lector de pantalla al cambiar de pantalla.
 *
 * Va una vez por página, arriba de todo:
 *
 *     usePageTitle('Clientes')
 *
 * Con un dato que todavía no llegó (la carátula de una causa) se pasa
 * `undefined` y queda el nombre de la aplicación hasta que llegue. Al salir de
 * la pantalla el título vuelve al de la aplicación, así una pantalla que no
 * usa el hook no se queda con el de la anterior.
 */
export function usePageTitle(title: string | undefined) {
    useEffect(() => {
        document.title = title ? `${title} · ${APP_TITLE}` : APP_TITLE
        return () => {
            document.title = APP_TITLE
        }
    }, [title])
}
