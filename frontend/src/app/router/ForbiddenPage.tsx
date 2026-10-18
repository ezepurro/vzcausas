import { useNavigate } from 'react-router'
import { Button, Icon, PageHeader, Panel } from '@/shared/components/ui'
import { useHomeRoute } from '@/app/access/useHomeRoute'

/**
 * Lo que se ve al entrar a una sección que el perfil no habilita.
 *
 * Se dibuja adentro del marco y no a pantalla completa: la persona tiene la
 * sesión abierta y el rail le sigue mostrando a dónde sí puede ir. No se la
 * redirige en silencio porque, si escribió la dirección a mano, tiene que
 * entender por qué no ve lo que pidió.
 */
export function ForbiddenPage() {
    const navigate = useNavigate()
    const homeRoute = useHomeRoute()

    return (
        <>
            <PageHeader
                title="Sin acceso"
                sub="Tu perfil no tiene permiso para ver esta sección."
            />
            <Panel>
                <div className="vz-empty">
                    <div className="vz-empty__title">No tenés permiso para ver esta sección</div>
                    <div className="vz-empty__text">
                        Si creés que lo necesitás, pedíselo a un administrador del estudio.
                    </div>
                    <Button icon={<Icon name="home" />} onClick={() => navigate(homeRoute)}>
                        Ir al inicio
                    </Button>
                </div>
            </Panel>
        </>
    )
}