/**
 * Lleva al usuario al primer campo con error de un formulario.
 *
 * En un formulario largo el botón de confirmar queda abajo y los errores
 * pueden estar arriba: sin esto, el que confirma no ve qué falló.
 *
 * Busca el primer `.vz-field--error` del contenedor —la marca que deja `Field`,
 * la fecha del hecho de cada calificación y la casilla de `FormModal`— y lleva
 * el scroll y el foco a su control. No usa `.vz-error` a secas porque también
 * lo llevan avisos que no son de un campo, como el del cómputo del plazo.
 *
 * Devuelve si encontró un campo. Lo normal es no llamarla directo sino a
 * través de `useFocusFirstError`, que la dispara al confirmar.
 */
export function focusFirstError(container: HTMLElement | null): boolean {
    const field = container?.querySelector('.vz-field--error')
    const target = field?.querySelector<HTMLElement>(
        'input:not([disabled]), select:not([disabled]), textarea:not([disabled])',
    )
    if (!target) return false

    // jsdom no implementa `matchMedia` ni `scrollIntoView`: de ahí los `?.`.
    const reduceMotion = window.matchMedia?.('(prefers-reduced-motion: reduce)').matches
    // Al centro y no arriba: la barra superior es sticky y taparía el campo.
    target.scrollIntoView?.({ block: 'center', behavior: reduceMotion ? 'auto' : 'smooth' })
    target.focus({ preventScroll: true })
    return true
}
