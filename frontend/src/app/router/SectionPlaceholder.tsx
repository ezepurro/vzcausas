import { PageHeader, Panel } from '@/shared/components/ui'

/**
 * Lo que se ve al entrar a una sección del menú que todavía no existe.
 *
 * El rail ya nombra las nueve secciones del sistema, pero varias llegan en
 * sprints posteriores. Sin esto, el usuario hace clic y se queda mirando una
 * pantalla en blanco sin saber si se rompió algo.
 */
export function SectionPlaceholder() {
    return (
        <>
            <PageHeader
                title="Sección en construcción"
                sub="Esta parte del sistema todavía no está disponible."
            />
            <Panel>
                <div className="vz-empty">
                    <div className="vz-empty__title">Todavía no hay nada por acá</div>
                    <div className="vz-empty__text">
                        La sección está prevista para una próxima entrega. Mientras tanto,
                        podés seguir trabajando desde el menú de la izquierda.
                    </div>
                </div>
            </Panel>
        </>
    )
}
