import type { ReactNode } from 'react'

/** Un número de la banda: "Vencidos", "2", "Requieren regularización". */
export interface SummaryTile {
    label: string
    value: number
    note: string
    /** Color del número cuando no es 0: lo que pide atención. */
    tone?: 'danger' | 'warn'
}

interface SummaryBandProps {
    tiles: SummaryTile[]
    /** Lo que va a la derecha de los números: "Lo primero de hoy" en "Mi día". */
    aside?: ReactNode
}

/**
 * La franja de arriba de los dos tableros (CA-41.2, CA-42.2). Presentacional:
 * recibe los números ya armados. Es una región con nombre, "Indicadores",
 * para que se pueda ubicar sin confundir sus rótulos con los grupos de plazos.
 */
export function SummaryBand({ tiles, aside }: SummaryBandProps) {
    return (
        <section className="vz-dash-band" aria-label="Indicadores">
            <div className="vz-dash-band__tiles">
                {tiles.map((tile) => (
                    <div key={tile.label} className="vz-dash-tile">
                        <div className="vz-dash-tile__label">{tile.label}</div>
                        <div
                            className={
                                tile.tone && tile.value > 0
                                    ? `vz-dash-tile__value vz-dash-tile__value--${tile.tone}`
                                    : 'vz-dash-tile__value'
                            }
                        >
                            {tile.value}
                        </div>
                        <div className="vz-dash-tile__note">{tile.note}</div>
                    </div>
                ))}
            </div>
            {aside && <div className="vz-dash-band__aside">{aside}</div>}
        </section>
    )
}