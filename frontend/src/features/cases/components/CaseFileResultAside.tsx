import { Button, Panel } from '@/shared/components/ui'
import type { CaseDocument } from '@/features/cases/types/caseDocument'

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
    onGenerate,
}: CaseFileResultAsideProps) {
    return (
        <Panel
            title="Resultado"
            sub={fileName}
            footer={
                <div className="vz-casefile__generate">
                    <Button block disabled={!canGenerate || generating} onClick={onGenerate}>
                        {generating ? 'Generando…' : 'Generar PDF'}
                    </Button>
                    <span className="vz-casefile__hint">{help}</span>
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
