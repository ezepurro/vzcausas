import { Button, Icon, LoadingState, Panel, Skeleton } from '@/shared/components/ui'
import { formatInstantDate, formatTime } from '@/shared/lib/dates'
import type { CaseDocument } from '@/features/cases/types/caseDocument'
import { documentTypeLabel, formatFileSize } from '@/features/cases/utils/caseDocument'

export interface CaseDocumentsCardProps {
    /** Con la carpeta sin crear no hay nada que leer (CA-38.5). */
    folderCreated: boolean
    /** Los documentos, del más reciente al más antiguo. `undefined` mientras no llegan. */
    documents: CaseDocument[] | undefined
    /** Cuándo se leyó la carpeta: "Sincronizado con Drive · 10:42". */
    readAt: string | null | undefined
    loading: boolean
    /** El mensaje del servidor si no se pudo leer la carpeta (CA-38.6), o `null`. */
    error: string | null
    /**
     * Si el usuario descarga los documentos que no son expedientes
     * (`cases.downloadDocument`: Abogado y Secretaría, D-103). El expediente
     * lo descarga cualquiera.
     */
    canDownloadDocuments: boolean
    /** El `id` del documento que se está bajando, o `null`. */
    downloadingId: string | null
    onDownload: (doc: CaseDocument) => void
}

/** Lo que explica "Descargar" deshabilitado. */
const DOWNLOAD_FORBIDDEN = 'Sólo el Abogado y la Secretaría descargan los documentos que no son expedientes.'

/** La nota al pie, del prototipo. */
const FOOTNOTE =
    'Los documentos se suben a la carpeta de Drive de la causa; esta lista se lee de ahí cada vez que abrís el detalle. RN9: el original en papel se archiva igual en el expediente físico.'

/**
 * La tarjeta "Documentación" del detalle de la causa (HU38): los archivos de
 * su carpeta en Drive, leídos en cada pedido (D-100). La ven los tres perfiles
 * (D-103).
 *
 * Cada documento muestra su tipo, su nombre, quién lo subió según Drive, la
 * fecha y el peso, "Abrir", que lo abre en Drive en otra pestaña, y
 * "Descargar", que lo baja por la API (CA-38.7). "Descargar" no está en el
 * prototipo: lo sumó el equipo (`cases/CAMBIOS.md`). A quien no puede bajar un
 * documento le aparece deshabilitado, como las demás acciones por perfil.
 *
 * "Abrir carpeta en Drive" no va acá: ya lo tiene la tarjeta de la carpeta, que
 * está arriba. Sin carpeta creada, la tarjeta lo dice y no lista nada.
 */
export function CaseDocumentsCard({ folderCreated, documents, readAt, loading, error, ...download }: CaseDocumentsCardProps) {
    const listed = folderCreated && !loading && !error ? documents : undefined

    return (
        <Panel
            title="Documentación"
            sub={listed ? filesCount(listed.length) : undefined}
            actions={folderCreated && !error ? <SyncStatus loading={loading} readAt={readAt} /> : undefined}
            footer={FOOTNOTE}
        >
            <Body folderCreated={folderCreated} documents={listed} loading={loading} error={error} download={download} />
        </Panel>
    )
}

/** Lo que cada fila necesita para "Descargar". */
type DownloadProps = Pick<CaseDocumentsCardProps, 'canDownloadDocuments' | 'downloadingId' | 'onDownload'>

/** "12 archivos", "1 archivo". */
function filesCount(n: number): string {
    return `${n} ${n === 1 ? 'archivo' : 'archivos'}`
}

/** "Leyendo la carpeta de Drive…" o "Sincronizado con Drive · 10:42", como el prototipo. */
function SyncStatus({ loading, readAt }: { loading: boolean; readAt: string | null | undefined }) {
    if (loading) return <span className="vz-docs__sync">Leyendo la carpeta de Drive…</span>
    if (!readAt) return null
    return <span className="vz-docs__sync">Sincronizado con Drive · {formatTime(readAt)}</span>
}

interface BodyProps extends Pick<CaseDocumentsCardProps, 'folderCreated' | 'documents' | 'loading' | 'error'> {
    download: DownloadProps
}

function Body({ folderCreated, documents, loading, error, download }: BodyProps) {
    if (!folderCreated) {
        return (
            <div className="vz-panel__body">
                <p className="vz-docs__note">La carpeta de la causa todavía no está creada en Drive.</p>
            </div>
        )
    }
    if (error) {
        return (
            <div className="vz-panel__body">
                <p className="vz-docs__note vz-docs__note--error">{error}</p>
            </div>
        )
    }
    if (loading || !documents) {
        return (
            <LoadingState label="Leyendo la carpeta de Drive…">
                <div className="vz-panel__body">
                    {[0, 1, 2].map((i) => <Skeleton key={i} height={40} />)}
                </div>
            </LoadingState>
        )
    }
    if (documents.length === 0) {
        return (
            <div className="vz-panel__body">
                <p className="vz-docs__note">
                    La carpeta todavía está vacía. Los escritos que se suban a Drive van a aparecer acá.
                </p>
            </div>
        )
    }
    return (
        <ul className="vz-docs">
            {documents.map((doc) => <DocumentRow key={doc.id} doc={doc} download={download} />)}
        </ul>
    )
}

/**
 * Un documento: "Gestión Estudio · 09/09/2026 · 88 KB". Sin autor (Drive no lo
 * informó) o sin peso (un documento nativo de Google), ese dato no se muestra.
 *
 * "Descargar" se deshabilita mientras baja el archivo de esta fila, y para
 * quien no puede bajarlo: el expediente lo baja cualquiera; lo demás, sólo
 * con `canDownloadDocuments`.
 */
function DocumentRow({ doc, download }: { doc: CaseDocument; download: DownloadProps }) {
    const meta = [doc.uploadedBy, formatInstantDate(doc.createdAt), formatFileSize(doc.sizeBytes)]
        .filter(Boolean)
        .join(' · ')
    const allowed = doc.caseFile !== null || download.canDownloadDocuments
    const downloading = download.downloadingId === doc.id

    return (
        <li className="vz-docs__item">
            <span className="vz-docs__type" aria-hidden="true">{documentTypeLabel(doc)}</span>
            <div className="vz-docs__main">
                <div className="vz-docs__name" title={doc.name}>{doc.name}</div>
                <div className="vz-docs__meta">{meta}</div>
            </div>
            <div className="vz-docs__actions">
                <a
                    className="vz-btn vz-btn--secondary vz-btn--sm"
                    href={doc.url}
                    target="_blank"
                    rel="noopener noreferrer"
                >
                    Abrir
                </a>
                <Button
                    variant="secondary"
                    size="sm"
                    icon={<Icon name="download" />}
                    disabled={!allowed || downloading}
                    title={allowed ? undefined : DOWNLOAD_FORBIDDEN}
                    onClick={() => download.onDownload(doc)}
                >
                    Descargar
                </Button>
            </div>
        </li>
    )
}