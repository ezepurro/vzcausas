import { LoadingState, Skeleton } from '@/shared/components/ui'

/*
 * Esqueletos de la causa. Usan las mismas clases que el encabezado y la línea
 * de vida de verdad, así cuando llegan los datos nada se corre de lugar.
 * Ninguno lleva texto: lo que se lee mientras carga es el `label` del
 * `LoadingState` que los envuelve.
 */

/** El encabezado de la causa: SAC, carátula, datos y el estado actual. */
export function CaseHeaderSkeleton() {
    return (
        <div className="vz-case-head">
            <div className="vz-case-head__top">
                <div className="vz-case-head__main">
                    <div className="vz-skel-stack">
                        <Skeleton width={110} height={11} />
                        <Skeleton width="68%" height={24} />
                        <Skeleton width="84%" />
                    </div>
                </div>
                <div className="vz-case-head__side">
                    <div className="vz-case-head__state">
                        <div className="vz-skel-stack">
                            <Skeleton width={130} height={10} />
                            <Skeleton width={160} height={16} />
                            <Skeleton shape="pill" width={140} />
                        </div>
                    </div>
                    <Skeleton shape="pill" width={190} height={36} />
                </div>
            </div>
        </div>
    )
}

/** Renglones de la línea de vida: los puntos y la línea los pone `.vz-timeline`. */
export function TimelineSkeleton({ items = 3 }: { items?: number }) {
    return (
        <ol className="vz-timeline">
            {Array.from({ length: items }, (_, i) => (
                <li key={i} className="vz-timeline__item">
                    <div className="vz-timeline__head">
                        <Skeleton width={i % 2 ? '38%' : '52%'} height={14} />
                        <Skeleton width={72} height={11} />
                    </div>
                    <div className="vz-skel-stack">
                        <Skeleton width="44%" height={11} />
                        <div className="vz-skel-row">
                            <Skeleton shape="pill" width={120} />
                            <Skeleton width={150} height={11} />
                        </div>
                        <Skeleton width="58%" height={10} />
                    </div>
                </li>
            ))}
        </ol>
    )
}

/** Un panel lateral del detalle: cliente o datos del fuero. */
function AsideCardSkeleton({ rows }: { rows: number }) {
    return (
        <div className="vz-skel-card">
            <Skeleton width="40%" height={14} />
            <div className="vz-skel-stack">
                {Array.from({ length: rows }, (_, i) => (
                    <div key={i} className="vz-skel-row">
                        <Skeleton width="38%" height={11} />
                        <span className="vz-skel-grow" />
                        <Skeleton width={i % 2 ? '30%' : '42%'} height={11} />
                    </div>
                ))}
            </div>
        </div>
    )
}

/** El detalle de causa entero mientras llega la causa. */
export function CaseDetailSkeleton() {
    return (
        <LoadingState label="Cargando causa…">
            <CaseHeaderSkeleton />
            <div className="vz-case-detail">
                <div className="vz-skel-card">
                    <div className="vz-skel-stack">
                        <Skeleton width="36%" height={14} />
                        <Skeleton width="62%" height={11} />
                    </div>
                    <TimelineSkeleton />
                </div>
                <div className="vz-case-detail__aside">
                    <AsideCardSkeleton rows={4} />
                    <AsideCardSkeleton rows={3} />
                </div>
            </div>
        </LoadingState>
    )
}
