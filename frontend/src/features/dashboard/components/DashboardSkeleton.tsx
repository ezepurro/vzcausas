import type { ReactNode } from 'react'
import { LoadingState, Skeleton } from '@/shared/components/ui'

export interface DashboardSkeletonProps {
    /** 'lawyer' es "Mi día"; 'administrator', "Estudio" */
    board: 'lawyer' | 'administrator'
}

/**
 * Un tablero mientras llega, con la disposición del de verdad: la banda de
 * indicadores arriba y, debajo, las mismas columnas. Usa las clases de
 * `dashboard.css` para la grilla, así nada se corre cuando llegan los datos.
 */
export function DashboardSkeleton({ board }: DashboardSkeletonProps) {
    return (
        <LoadingState label="Cargando el tablero…">
            <div className="vz-dash">
                <BandSkeleton />
                {board === 'lawyer' ? (
                    <>
                        <div className="vz-dash__row">
                            <div className="vz-dash__main">
                                <PanelSkeleton>
                                    <Skeleton shape="block" height={360} />
                                </PanelSkeleton>
                            </div>
                            <div className="vz-dash__side">
                                <PanelSkeleton><RowsSkeleton rows={3} /></PanelSkeleton>
                                <PanelSkeleton><RowsSkeleton rows={3} /></PanelSkeleton>
                            </div>
                        </div>
                        <PanelSkeleton><RowsSkeleton rows={4} /></PanelSkeleton>
                    </>
                ) : (
                    <div className="vz-dash__row">
                        <div className="vz-dash__main">
                            <PanelSkeleton><RowsSkeleton rows={6} /></PanelSkeleton>
                        </div>
                        <div className="vz-dash__side">
                            <PanelSkeleton><RowsSkeleton rows={3} /></PanelSkeleton>
                            <PanelSkeleton><RowsSkeleton rows={4} /></PanelSkeleton>
                        </div>
                    </div>
                )}
            </div>
        </LoadingState>
    )
}

/** La franja oscura: los cuatro indicadores y, a la derecha, lo que cada tablero pone ahí. */
function BandSkeleton() {
    return (
        <div className="vz-dash-band">
            <div className="vz-dash-band__tiles">
                {[0, 1, 2, 3].map((i) => (
                    <div key={i} className="vz-dash-tile">
                        <div className="vz-skel-stack">
                            <Skeleton onDark width="70%" height={10} />
                            <Skeleton onDark width={48} height={34} />
                            <Skeleton onDark width="85%" height={10} />
                        </div>
                    </div>
                ))}
            </div>
            <div className="vz-dash-band__aside">
                <Skeleton onDark width="40%" height={10} />
                <Skeleton onDark shape="block" height={72} />
            </div>
        </div>
    )
}

/** Un panel del tablero: el título y lo que lleva adentro. */
function PanelSkeleton({ children }: { children: ReactNode }) {
    return (
        <div className="vz-skel-card">
            <div className="vz-skel-stack">
                <Skeleton width="42%" height={14} />
                <Skeleton width="64%" height={10} />
            </div>
            {children}
        </div>
    )
}

/** Renglones de un listado corto: un chip, el texto y la fecha. */
function RowsSkeleton({ rows }: { rows: number }) {
    return (
        <div className="vz-skel-stack">
            {Array.from({ length: rows }, (_, i) => (
                <div key={i} className="vz-skel-row vz-skel-row--ruled">
                    <Skeleton shape="pill" width={72} />
                    <div className="vz-skel-stack vz-skel-grow">
                        <Skeleton width={i % 2 ? '58%' : '76%'} height={12} />
                        <Skeleton width="40%" height={10} />
                    </div>
                    <Skeleton width={56} height={11} />
                </div>
            ))}
        </div>
    )
}
