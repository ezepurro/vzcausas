/**
 * La columna oscura del login: quién es el estudio.
 *
 * No usa `<Logo />` de shared a propósito. Ese componente está hecho para el
 * rail —dice "VZ Causas", el nombre del sistema— y sus estilos dependen de
 * las clases del rail. Acá la jerarquía es otra: lo que se presenta es el
 * estudio, no la aplicación.
 *
 * Es decoración: en pantallas angostas desaparece entera y no se pierde nada.
 */
export function LoginAside() {
    return (
        <aside className="vz-login__aside">
            <div className="vz-login__watermark" aria-hidden="true">
                <svg width="460" height="322" viewBox="0 0 60 42" fill="none">
                    <path d="M2 2h12l10 26L34 2h12L28 40H16L2 2z" fill="currentColor" />
                    <path d="M38 2h20L40 34h18v6H30L48 8H38V2z" fill="currentColor" />
                </svg>
            </div>

            <div className="vz-login__brand">
                <svg
                    className="vz-login__brand-mark"
                    width="38"
                    height="27"
                    viewBox="0 0 60 42"
                    fill="none"
                    aria-hidden="true"
                >
                    <path d="M2 2h12l10 26L34 2h12L28 40H16L2 2z" fill="currentColor" />
                    <path d="M38 2h20L40 34h18v6H30L48 8H38V2z" fill="currentColor" opacity=".55" />
                </svg>
                <div>
                    <div className="vz-login__brand-name">Vázquez &amp; Zárate</div>
                    <div className="vz-login__brand-kicker">Staff de Abogados</div>
                </div>
            </div>

            <blockquote className="vz-login__quote">
                <p>
                    «Nuestro trabajo no pierde de vista que, detrás de cada caso, hay
                    personas inmersas en la incertidumbre de un largo proceso judicial.»
                </p>
                <span className="vz-login__quote-rule" />
            </blockquote>

            {/* Empuja la cita al centro: la marca queda arriba y este bloque
                vacío abajo. */}
            <div />
        </aside>
    )
}
