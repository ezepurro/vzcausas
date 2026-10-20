import { Skeleton } from '@/shared/components/ui'

/** Los campos del formulario: rótulo y control, uno debajo del otro. */
const FIELDS = ['38%', '24%', '30%', '46%']

/**
 * El formulario de Registrar acto y su panel lateral mientras llegan los
 * estados del fuero. Va adentro de un `LoadingState`, que es el que anuncia
 * la carga.
 */
export function ProceduralActFormSkeleton() {
    return (
        <div className="vz-split">
            <div className="vz-skel-card">
                <Skeleton width="34%" height={14} />
                {FIELDS.map((width, i) => (
                    <div key={i} className="vz-skel-stack">
                        <Skeleton width={width} height={11} />
                        <Skeleton shape="block" height={38} />
                    </div>
                ))}
                <div className="vz-skel-row">
                    <span className="vz-skel-grow" />
                    <Skeleton shape="pill" width={90} height={36} />
                    <Skeleton shape="pill" width={150} height={36} />
                </div>
            </div>
            <aside className="vz-split__aside">
                <div className="vz-skel-card">
                    <Skeleton width="50%" height={14} />
                    <DeadlinePreviewSkeleton />
                </div>
            </aside>
        </div>
    )
}

/** El cómputo del vencimiento: tres renglones y el recuadro de la fecha. */
export function DeadlinePreviewSkeleton() {
    return (
        <div className="vz-skel-stack">
            {['44%', '36%', '52%'].map((width, i) => (
                <div key={i} className="vz-skel-row">
                    <Skeleton width={width} height={11} />
                    <span className="vz-skel-grow" />
                    <Skeleton width="28%" height={11} />
                </div>
            ))}
            <Skeleton shape="block" height={88} />
        </div>
    )
}
