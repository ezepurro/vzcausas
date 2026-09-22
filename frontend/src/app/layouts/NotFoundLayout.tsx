import { useLocation, useNavigate } from 'react-router'
import { Button, Icon, Logo } from '@/shared/components/ui'

/**
 * Pantalla de "no encontrada": cualquier ruta que el router no conoce cae
 * acá, incluidas las secciones del rail que todavía no tienen pantalla.
 *
 * Es una tarjeta partida en dos: a la izquierda un bloque oscuro del color
 * del rail con el logo y el 404 sobre unas órbitas (la dirección visual del
 * producto), y a la derecha el mensaje y las salidas. En pantallas angostas
 * las dos mitades se apilan solas por el flex-wrap.
 *
 * Los estilos van inline y salen de los tokens (var(--vz-*)), igual que en
 * AuthLayout, hasta que el CSS de estas pantallas se extraiga a src/styles.
 */
export function NotFoundLayout() {
    const navigate = useNavigate()
    const { pathname } = useLocation()

    return (
        <div
            style={{
                minHeight: '100vh',
                display: 'grid',
                placeItems: 'center',
                padding: 24,
                background: 'var(--vz-canvas)',
                fontFamily: 'var(--vz-font)',
            }}
        >
            <main
                style={{
                    width: '100%',
                    maxWidth: 860,
                    display: 'flex',
                    flexWrap: 'wrap',
                    background: 'var(--vz-surface)',
                    border: '1px solid var(--vz-border)',
                    borderRadius: 'var(--vz-r)',
                    boxShadow: 'var(--vz-pop-sh)',
                    overflow: 'hidden',
                }}
            >
                {/* Mitad oscura: logo y el 404 sobre las órbitas. */}
                <div
                    style={{
                        flex: '1 1 320px',
                        position: 'relative',
                        minHeight: 300,
                        display: 'flex',
                        flexDirection: 'column',
                        justifyContent: 'space-between',
                        padding: '20px 8px 28px',
                        background: 'var(--vz-rail)',
                        overflow: 'hidden',
                    }}
                >
                    <Orbits />

                    <div style={{ position: 'relative' }}>
                        <Logo />
                    </div>

                    <div
                        aria-hidden="true"
                        style={{
                            position: 'relative',
                            textAlign: 'center',
                            fontSize: 112,
                            fontWeight: 800,
                            lineHeight: 1,
                            letterSpacing: '-.04em',
                            color: 'var(--vz-rail-logo)',
                        }}
                    >
                        4<span style={{ color: 'var(--vz-primary)' }}>0</span>4
                    </div>

                    <div
                        style={{
                            position: 'relative',
                            textAlign: 'center',
                            fontSize: 12,
                            letterSpacing: '.09em',
                            textTransform: 'uppercase',
                            color: 'var(--vz-rail-fg)',
                        }}
                    >
                        FUERA DE JURISDICCIÓN
                    </div>
                </div>

                {/* Mitad clara: el mensaje y a dónde ir. */}
                <section
                    style={{
                        flex: '1 1 360px',
                        display: 'flex',
                        flexDirection: 'column',
                        justifyContent: 'center',
                        gap: 14,
                        padding: '40px 36px',
                    }}
                >
                    <div className="vz-eyebrow">Error 404</div>

                    <h1 style={{ margin: 0, fontSize: 26, lineHeight: 1.2, color: 'var(--vz-ink)' }}>
                        Esta página no está en el expediente
                    </h1>

                    <p style={{ margin: 0, fontSize: 14, lineHeight: 1.55, color: 'var(--vz-muted)' }}>
                        La dirección que buscás no existe o la sección todavía está en
                        construcción. Revisá el enlace o volvé a un lugar conocido.
                    </p>

                    <div
                        style={{
                            display: 'flex',
                            alignItems: 'center',
                            gap: 8,
                            padding: '9px 12px',
                            background: 'var(--vz-sunken)',
                            border: '1px solid var(--vz-border)',
                            borderRadius: 'var(--vz-r-sm)',
                            color: 'var(--vz-faint)',
                            fontFamily: 'var(--vz-font-mono)',
                            fontSize: 12.5,
                            overflow: 'hidden',
                        }}
                    >
                        <Icon name="alert" size={15} />
                        <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                            {pathname}
                        </span>
                    </div>

                    <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8, marginTop: 10 }}>
                        <Button icon={<Icon name="home" />} onClick={() => navigate('/inicio')}>
                            Ir al inicio
                        </Button>
                        <Button variant="secondary" icon={<Icon name="back" />} onClick={() => navigate(-1)}>
                            Volver
                        </Button>
                    </div>
                </section>
            </main>
        </div>
    )
}

/** Anillos concéntricos de fondo, con un par de "planetas" sobre ellos. */
function Orbits() {
    return (
        <svg
            aria-hidden="true"
            viewBox="0 0 400 400"
            preserveAspectRatio="xMidYMid slice"
            style={{ position: 'absolute', inset: 0, width: '100%', height: '100%' }}
        >
            <g fill="none" stroke="var(--vz-rail-div)" strokeWidth="1.5">
                <circle cx="200" cy="215" r="70" />
                <circle cx="200" cy="215" r="120" />
                <circle cx="200" cy="215" r="175" strokeDasharray="4 8" />
                <circle cx="200" cy="215" r="235" />
            </g>
            <circle cx="285" cy="130" r="6" fill="var(--vz-primary)" />
            <circle cx="60" cy="325" r="4" fill="var(--vz-rail-fg)" opacity=".6" />
            <circle cx="395" cy="345" r="3" fill="var(--vz-rail-fg)" opacity=".4" />
        </svg>
    )
}
