import { LoadingState, Skeleton } from '@/shared/components/ui'

export interface DocumentTemplatesSkeletonProps {
    /** 'jurisdictions' la vista general, una tarjeta por fuero; 'templates' los modelos de un fuero */
    view: 'jurisdictions' | 'templates'
}

/** Los tres fueros de la vista general. */
const JURISDICTION_CARDS = 3
/** Modelos de un fuero: una fila y media de la grilla en una pantalla ancha. */
const TEMPLATE_CARDS = 6

/** Las tarjetas de Modelos formales mientras llegan, con la forma de las de verdad. */
export function DocumentTemplatesSkeleton({ view }: DocumentTemplatesSkeletonProps) {
    const cards = Array.from({ length: view === 'jurisdictions' ? JURISDICTION_CARDS : TEMPLATE_CARDS }, (_, i) => i)

    return (
        <LoadingState label="Cargando modelos…">
            <div className="vz-card-grid">
                {cards.map((i) =>
                    view === 'jurisdictions' ? (
                        <div key={i} className="vz-skel-card vz-skel-card--roomy">
                            <Skeleton shape="block" width={52} height={52} />
                            <div className="vz-skel-stack">
                                <Skeleton width="45%" height={20} />
                                <Skeleton width="92%" />
                                <Skeleton width="70%" />
                            </div>
                            <div className="vz-skel-card__foot">
                                <Skeleton width={80} />
                                <Skeleton width={110} />
                            </div>
                        </div>
                    ) : (
                        <div key={i} className="vz-skel-card">
                            <div className="vz-skel-row">
                                <Skeleton shape="block" width={44} height={44} />
                                <div className="vz-skel-stack vz-skel-grow">
                                    <Skeleton width={i % 2 ? '80%' : '64%'} height={14} />
                                    <Skeleton width="50%" height={10} />
                                </div>
                            </div>
                            <div className="vz-skel-row">
                                <Skeleton shape="pill" width={64} />
                                <Skeleton shape="pill" width={150} />
                            </div>
                            <div className="vz-skel-stack">
                                <Skeleton width="60%" />
                                <Skeleton width="44%" />
                            </div>
                            <Skeleton shape="pill" width={110} height={30} />
                        </div>
                    ),
                )}
            </div>
        </LoadingState>
    )
}
