import { JURISDICTION_LABELS } from '@/features/legal-params'
import { Button, Icon, Pill } from '@/shared/components/ui'
import { formatDate } from '@/shared/lib/dates'
import { formatPersonFullName } from '@/shared/lib/personName'
import type { DocumentTemplate } from '@/features/documents/types/documentTemplate'
import { countLabel, versionDay } from '@/features/documents/utils/templateFormat'

export interface DocumentTemplateCardProps {
    template: DocumentTemplate
    /** true mientras se baja el archivo de esta tarjeta */
    downloading: boolean
    onDownload: () => void
}

/** Un modelo dentro de la vista de su fuero: los datos de CA-35.10 y "Descargar". */
export function DocumentTemplateCard({ template, downloading, onDownload }: DocumentTemplateCardProps) {
    return (
        <article className="vz-template-card">
            <div className="vz-template-card__head">
                <span className="vz-template-card__badge" aria-hidden="true">DOCX</span>
                <div className="vz-template-card__title">
                    <h3 className="vz-template-card__name">{template.name}</h3>
                    <div className="vz-template-card__file">{template.fileName}</div>
                </div>
            </div>

            <div className="vz-template-card__tags">
                {template.jurisdictions.map((j) => (
                    <Pill key={j}>{JURISDICTION_LABELS[j]}</Pill>
                ))}
                {template.copyToNewCases && <Pill tone="primary" dot>Se copia a causas nuevas</Pill>}
            </div>

            <div className="vz-template-card__meta">
                <span>
                    Última versión <b>{formatDate(versionDay(template.lastVersionAt))}</b>
                </span>
                <span className="vz-template-card__uses">{countLabel(template.usageCount, 'uso', 'usos')}</span>
                <span className="vz-template-card__author">
                    Cargada por {formatPersonFullName(template.lastVersionBy)}
                </span>
            </div>

            <div className="vz-template-card__actions">
                <Button size="sm" icon={<Icon name="download" />} disabled={downloading} onClick={onDownload}>
                    Descargar
                </Button>
            </div>
        </article>
    )
}
