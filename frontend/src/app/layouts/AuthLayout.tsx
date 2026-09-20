import { Outlet } from 'react-router'
import { Logo } from '@/shared/components/ui'

/**
 * Marco de las pantallas que se ven sin sesión: hoy sólo el login.
 *
 * No tiene rail ni barra superior, justamente porque todavía no hay a dónde
 * navegar: el usuario no entró.
 *
 * Los estilos van inline y salen de los tokens (var(--vz-*)), no de valores
 * escritos a mano. El prototipo tiene su propia pantalla de login, pero su
 * CSS todavía no está extraído a src/styles; cuando lo esté, esto pasa a
 * usar esas clases.
 */
export function AuthLayout() {
    return (
        <div
            style={{
                minHeight: '100vh',
                display: 'grid',
                placeItems: 'center',
                padding: 24,
                background: 'var(--vz-canvas)',
            }}
        >
            <div style={{ width: '100%', maxWidth: 420 }}>
                {/* El logo está pensado para el rail oscuro, así que acá va
                    sobre un bloque del mismo color. */}
                <div
                    style={{
                        background: 'var(--vz-rail)',
                        borderRadius: 'var(--vz-r)',
                        padding: '18px 4px 4px',
                        marginBottom: 18,
                    }}
                >
                    <Logo />
                </div>

                <Outlet />
            </div>
        </div>
    )
}
