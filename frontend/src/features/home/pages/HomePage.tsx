import { useCurrentUser } from '@/app/providers/AuthContext'
import { PageHeader, Panel } from '@/shared/components/ui'

/**
 * La pantalla a la que se entra después de iniciar sesión.
 *
 * Por ahora sólo confirma quién está adentro. El tablero de control con las
 * causas del día, los vencimientos próximos y los indicadores del estudio
 * llega con su propia épica; este módulo le guarda el lugar y la ruta.
 */
export function HomePage() {
    const user = useCurrentUser()

    return (
        <>
            <PageHeader
                eyebrow="Trabajo diario"
                title={`Hola, ${user.firstName}`}
                sub="Desde el menú de la izquierda llegás a las causas, los vencimientos y la administración del estudio."
            />
            <Panel
                title="Tablero de control"
                sub="Las causas del día, los plazos por vencer y los indicadores del estudio."
            >
                <div className="vz-empty">
                    <div className="vz-empty__title">El tablero llega en una próxima entrega</div>
                    <div className="vz-empty__text">
                        Mientras tanto, la sesión ya está activa y podés recorrer las
                        secciones disponibles.
                    </div>
                </div>
            </Panel>
        </>
    )
}
