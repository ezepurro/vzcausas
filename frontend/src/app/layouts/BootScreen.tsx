import { useState } from 'react'

/** Duraciones de las animaciones: son los mismos valores que el CSS de `index.html`. */
export const ORBIT_MS = 2400
export const DOTS_MS = 1200

/** Desfase para seguir la animación del HTML, que arrancó al abrirse la página. */
const delayFor = (duration: number) => `-${Math.round(performance.now() % duration)}ms`

/**
 * La pantalla de carga de la aplicación: el monograma VZ con dos órbitas. En
 * la de afuera gira un punto con su estela, y un brillo suave recorre la del
 * medio en el mismo sentido. Los puntos suspensivos del texto se van
 * encendiendo de a uno. Se ve en tres momentos seguidos, siempre igual:
 *
 * 1. Apenas llega `index.html`, antes de cualquier JavaScript: está escrita
 *    adentro de `#root`, con sus estilos ahí mismo. Así un F5 no queda en
 *    blanco mientras arranca la app (y, con mocks, mientras arranca MSW).
 * 2. "Verificando la sesión…" (`SessionCheck` de `AuthProvider`).
 * 3. "Cargando…" mientras llega el archivo de la pantalla (`lazy`), como
 *    `hydrateFallbackElement` de la raíz del router.
 *
 * `label` va sin los puntos suspensivos: los agrega la pantalla, animados. El
 * texto sigue siendo "Cargando…" (el "…" se revela recortándolo, no se
 * reemplaza), así lo lee igual un lector de pantalla.
 *
 * El marcado es el de `index.html`, con las mismas clases: los estilos viven
 * ahí y quedan en la página siempre. `tests/unit/app/bootScreen.test.tsx`
 * verifica que los dos sigan iguales.
 *
 * Cuando React reemplaza el HTML, las animaciones empezarían de cero y
 * pegarían un salto. Por eso cada una arranca desfasada en lo que ya lleva la
 * página abierta (según su propia duración): las del HTML empezaron cuando se
 * abrió, así que siguen juntas.
 */
export function BootScreen({ label }: { label: string }) {
    // Una sola vez, al montarse: si se recalculara, saltarían en cada render.
    const [delays] = useState(() => ({ orbit: delayFor(ORBIT_MS), dots: delayFor(DOTS_MS) }))

    return (
        <div className="vz-boot" role="status">
            <svg className="vz-boot__art" viewBox="0 0 132 132" aria-hidden="true">
                <defs>
                    <linearGradient id="vz-boot-tail" gradientUnits="userSpaceOnUse" x1="8" y1="66" x2="66" y2="8">
                        <stop className="vz-boot__stop" offset="0" stopOpacity="0" />
                        <stop className="vz-boot__stop" offset="1" stopOpacity=".6" />
                    </linearGradient>
                    <linearGradient id="vz-boot-glow" gradientUnits="userSpaceOnUse" x1="33.1" y1="85" x2="66" y2="28">
                        <stop className="vz-boot__stop" offset="0" stopOpacity="0" />
                        <stop className="vz-boot__stop" offset="1" stopOpacity=".35" />
                    </linearGradient>
                </defs>
                <circle className="vz-boot__ring" cx="66" cy="66" r="38" />
                <circle className="vz-boot__ring vz-boot__ring--dashed" cx="66" cy="66" r="58" />
                <svg x="48" y="53" width="36" height="26" viewBox="0 0 60 42">
                    <path className="vz-boot__mark" d="M2 2h12l10 26L34 2h12L28 40H16L2 2z" />
                    <path className="vz-boot__mark" d="M38 2h20L40 34h18v6H30L48 8H38V2z" opacity=".55" />
                </svg>
                {/* Todo lo que gira va en un grupo: el brillo del medio (120°) y la
                    estela (90°) son arcos detrás del punto, en el mismo sentido. */}
                <g className="vz-boot__orbit" style={{ animationDelay: delays.orbit }}>
                    <path className="vz-boot__glow" d="M33.1 85A38 38 0 0 1 66 28" stroke="url(#vz-boot-glow)" />
                    <path className="vz-boot__tail" d="M8 66A58 58 0 0 1 66 8" stroke="url(#vz-boot-tail)" />
                    <circle className="vz-boot__dot" cx="66" cy="8" r="4.5" />
                </g>
            </svg>
            <p className="vz-boot__text">
                {label}
                <span className="vz-boot__ellipsis" style={{ animationDelay: delays.dots }}>
                    …
                </span>
            </p>
        </div>
    )
}
