import type { MonthlyReport } from '@/features/dashboard/types/monthlyReport'
import { changeNote, formatDecimal } from '@/features/dashboard/utils/reportPeriod'

/**
 * Las cuatro tarjetas del reporte (CA-43.8), con las clases de la franja de los tableros. `SummaryBand` no sirve: su valor es un entero y el promedio lleva un decimal.
 *
 * Presentacional: dibuja lo que manda el backend, sin recalcular (D-120).
 * SVG y CSS, sin librería de gráficos.
 */
export function ReportKpis({ report, cutoff }: { report: MonthlyReport; cutoff: string }) {
    const s = report.summary
    const change = (n: number | null) => changeNote(n) ?? 'Sin mes anterior con reporte'
    const tiles = [
        { label: 'Causas activas', value: String(s.activeCases), note: `Al ${cutoff}` },
        { label: 'Ingresadas en el mes', value: String(s.admitted), note: change(s.admittedChange) },
        { label: 'Archivadas en el mes', value: String(s.archived), note: change(s.archivedChange) },
        {
            label: 'Promedio por abogado',
            value: formatDecimal(s.averagePerLawyer),
            note: s.minPerLawyer !== null && s.maxPerLawyer !== null
                ? `Entre ${s.minPerLawyer} y ${s.maxPerLawyer} causas`
                : 'Sin abogados en el período',
        },
    ]
    return (
        <section className="vz-dash-band" aria-label="Indicadores">
            <div className="vz-dash-band__tiles">
                {tiles.map((tile) => (
                    <div key={tile.label} className="vz-dash-tile">
                        <div className="vz-dash-tile__label">{tile.label}</div>
                        <div className="vz-dash-tile__value">{tile.value}</div>
                        <div className="vz-dash-tile__note">{tile.note}</div>
                    </div>
                ))}
            </div>
        </section>
    )
}
