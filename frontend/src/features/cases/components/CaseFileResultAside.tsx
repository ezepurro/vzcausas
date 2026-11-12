import { useEffect, useState } from 'react'
import { Button, Panel } from '@/shared/components/ui'
import type { CaseDocument } from '@/features/cases/types/caseDocument'
import { elapsedLabel } from '@/features/cases/utils/caseFile'

export interface CaseFileResultAsideProps {
    /** `Expediente_13284571_v2.pdf`: el nombre estimado (`caseFileNamePreview`). */
    fileName: string
    /** Los documentos incluidos, en orden. La carátula la agrega el panel. */
    parts: Pick<CaseDocument, 'id' | 'name'>[]
    /** "3 partes en un solo PDF · …" (`caseFileSummary`). */
    summary: string
    /** La ayuda bajo el botón. */
    help: string
    canGenerate: boolean
    generating: boolean
    /** "Uniendo la carátula y 3 documentos…" (`generatingMessage`), mientras se genera. */
    progress: string
    /** Un aviso que queda hasta el próximo intento, o `null`. Ocupa el lugar de la ayuda. */
    notice: string | null
    onGenerate: () => void
}

/**
 * El panel "Resultado" de "Generar expediente" (HU25): el índice del PDF que
 * se va a armar, en el orden de la lista, y "Generar PDF".
 */
export function CaseFileResultAside({
    fileName,
    parts,
    summary,
    help,
    canGenerate,
    generating,
    progress,
    notice,
    onGenerate,
}: CaseFileResultAsideProps) {
    return (
        <Panel
            title="Resultado"
            sub={fileName}
            footer={
                <div className="vz-casefile__generate">
                    <Button
                        block
                        disabled={!canGenerate || generating}
                        icon={generating ? <span className="vz-casefile__spinner" aria-hidden="true" /> : undefined}
                        onClick={onGenerate}
                    >
                        {generating ? 'Generando…' : 'Generar PDF'}
                    </Button>
                    {generating && <span className="vz-casefile__progress" aria-hidden="true" />}
                    {generating ? (
                        <span className="vz-casefile__hint">
                            <span role="status">{progress}</span> <Elapsed />
                        </span>
                    ) : notice ? (
                        <p className="vz-casefile__notice" role="alert">{notice}</p>
                    ) : (
                        <span className="vz-casefile__hint">{help}</span>
                    )}
                </div>
            }
        >
            <ol className="vz-casefile__index" aria-label="Partes del expediente">
                <li>
                    <span className="vz-casefile__index-n">1</span>
                    <span className="vz-casefile__index-name vz-casefile__index-name--cover">
                        Carátula · generada con los datos de la causa
                    </span>
                </li>
                {parts.map((part, i) => (
                    <li key={part.id}>
                        <span className="vz-casefile__index-n">{i + 2}</span>
                        <span className="vz-casefile__index-name" title={part.name}>{part.name}</span>
                    </li>
                ))}
            </ol>
            <p className="vz-casefile__summary">{summary}</p>
        </Panel>
    )
}

/**
 * "Lleva 42 s", desde que se empezó a generar: se monta con la generación y
 * se va con ella. Oculto al lector de pantalla, que si no lo leería cada
 * segundo.
 */
function Elapsed() {
    const [seconds, setSeconds] = useState(0)

    useEffect(() => {
        const timer = window.setInterval(() => setSeconds((s) => s + 1), 1000)
        return () => window.clearInterval(timer)
    }, [])

    return <span aria-hidden="true">· {elapsedLabel(seconds)}</span>
}
