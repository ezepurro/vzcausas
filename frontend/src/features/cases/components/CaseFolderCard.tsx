import { Button, Icon, Panel, Pill, type PillTone } from '@/shared/components/ui'
import { formatPersonFullName, formatPersonName } from '@/shared/lib/personName'
import { JURISDICTION_LABELS } from '@/features/legal-params'
import type { Case, CaseFolderStatus } from '@/features/cases/types/case'
import { copiedTemplatesText } from '@/features/cases/utils/caseFolder'

export interface CaseFolderCardProps {
    case: Case
    /** Pidiendo la carpeta al servidor: la tarjeta lo muestra y el botón se deshabilita. */
    creating: boolean
    /** El mensaje del último intento fallido, o `null`. */
    error: string | null
    /**
     * El usuario puede crear o reintentar la carpeta: el responsable, el
     * Administrador o la Secretaría (D-110). Si no, el botón se ve deshabilitado;
     * "Abrir carpeta en Drive" no depende de esto.
     */
    canCreate: boolean
    onCreate: () => void
}

/** `NONE` es una causa de antes de V4: no tiene carpeta ni `status`. */
type FolderView = CaseFolderStatus | 'NONE'

/**
 * Cómo se ve cada situación. Los rótulos son los de `CaseFolderStatus`
 * (V4 §2); "Creada" es del front, para que la tarjeta diga siempre en qué
 * está. Sin carpeta no lleva rótulo: ya lo dice el título.
 */
const VIEW: Record<FolderView, { label: string | null; tone: PillTone; note: string | null }> = {
    CREATED: { label: 'Creada', tone: 'ok', note: null },
    PENDING: {
        label: 'Carpeta pendiente',
        tone: 'neutral',
        note: 'La causa se registró sin carpeta. Al crearla se copian los modelos del fuero.',
    },
    CREATING: {
        label: 'Creando carpeta',
        tone: 'primary',
        note: 'Drive todavía no respondió. La tarjeta se actualiza sola.',
    },
    ERROR: {
        label: 'Error en la carpeta',
        tone: 'danger',
        note: 'Drive no respondió cuando se pidió. Podés volver a intentarlo.',
    },
    NONE: {
        label: null,
        tone: 'neutral',
        note: 'La causa se registró antes de que existieran las carpetas en Drive.',
    },
}

/** Lo que dice la tarjeta mientras espera la respuesta del pedido. */
const REQUESTING = {
    label: 'Creando carpeta…',
    tone: 'primary' as PillTone,
    note: 'Pidiendo la carpeta a Drive. Puede tardar unos segundos.',
}

/**
 * La tarjeta "Carpeta en Drive" del detalle de la causa (HU39, HU40).
 *
 * Arriba, la carpeta: su nombre (la carátula) y dónde va (abogado › fuero).
 * Salen de la causa y no de `folder.path`, que el contrato pide no separar en
 * partes (y que el backend manda en `null` mientras no está creada). La ruta
 * completa, si viene, queda en el `title`.
 *
 * Debajo, en qué situación está y qué se puede hacer. Con la carpeta creada,
 * la abre en otra pestaña. Si no la tiene (`null` o `PENDING`) ofrece crearla,
 * y si falló, reintentarla: las dos van por `POST /cases/{caseId}/folder`, que
 * además copia los modelos que faltaban. Mientras el pedido está en curso, y
 * mientras el servidor la sigue creando (`CREATING`), lo muestra con una barra
 * en movimiento. Lo puede usar cualquier perfil, igual que el alta de la causa.
 *
 * El botón no está en el prototipo (V4 §3.7).
 */
export function CaseFolderCard({ case: c, creating, error, canCreate, onCreate }: CaseFolderCardProps) {
    const folder = c.folder
    const view: FolderView = folder?.status ?? 'NONE'
    const { label, tone, note } = creating ? REQUESTING : VIEW[view]
    const busy = creating || view === 'CREATING'
    const needsFolder = view === 'NONE' || view === 'PENDING' || view === 'ERROR'
    const created = folder?.status === 'CREATED' ? folder : null
    const copied = created ? copiedTemplatesText(created) : null
    const missing = created?.templatesPending ?? 0
    const modifier = creating ? 'requesting' : view.toLowerCase()
    // Mientras no existe se muestra dónde *va* a quedar, no como si ya estuviera.
    const exists = created !== null && !creating
    const whereLabel = exists ? null : busy ? 'Se está creando en' : 'Se va a crear en'

    return (
        <Panel title="Carpeta en Drive">
            <div
                className={`vz-panel__body vz-case-folder vz-case-folder--${modifier}${exists ? '' : ' vz-case-folder--draft'}`}
                aria-busy={busy}
            >
                <div className="vz-case-folder__head">
                    <span className="vz-case-folder__icon">
                        <Icon name={view === 'ERROR' && !creating ? 'alert' : 'folder'} size={20} />
                    </span>
                    <div className="vz-case-folder__id">
                        <div className="vz-case-folder__name" title={folder?.path ?? undefined}>
                            {c.caption}
                        </div>
                        <div className="vz-case-folder__where">
                            {whereLabel && <span className="vz-case-folder__where-label">{whereLabel} </span>}
                            {formatPersonName(c.responsibleLawyer)}
                            <span className="vz-case-folder__sep" aria-hidden="true">›</span>
                            {JURISDICTION_LABELS[c.jurisdiction]}
                        </div>
                    </div>
                </div>

                {busy && <div className="vz-case-folder__progress" aria-hidden="true" />}

                {/* `role="status"`: un lector de pantalla anuncia el cambio sin mover el foco. */}
                <div className="vz-case-folder__live" role="status">
                    {label && (
                        <div className="vz-case-folder__status">
                            <Pill tone={tone} dot>{label}</Pill>
                            {copied && <span className="vz-case-folder__meta">{copied}</span>}
                            {missing > 0 && (
                                <span className="vz-case-folder__meta">
                                    {missing === 1 ? '1 modelo sin copiar' : `${missing} modelos sin copiar`}
                                </span>
                            )}
                        </div>
                    )}
                    {note && <p className="vz-case-folder__note">{note}</p>}
                </div>

                {created?.url && (
                    <a
                        className="vz-btn vz-btn--primary vz-btn--sm vz-btn--block"
                        href={created.url}
                        target="_blank"
                        rel="noopener noreferrer"
                    >
                        <Icon name="external" size={14} />
                        Abrir carpeta en Drive
                    </a>
                )}
                {needsFolder && (
                    <Button
                        title={canCreate
                            ? undefined
                            : `Solo el abogado responsable (${formatPersonFullName(c.responsibleLawyer)}) crea o reintenta la carpeta.`}
                        size="sm"
                        block
                        variant={view === 'ERROR' ? 'secondary' : 'primary'}
                        icon={
                            creating
                                ? <span className="vz-case-folder__spinner" aria-hidden="true" />
                                : <Icon name={view === 'ERROR' ? 'forward' : 'plus'} size={14} />
                        }
                        disabled={creating || !canCreate}
                        onClick={onCreate}
                    >
                        {view === 'ERROR' ? 'Reintentar' : 'Crear carpeta'}
                    </Button>
                )}
                {error && !creating && (
                    <div className="vz-case-folder__error" role="alert">
                        <Icon name="alert" size={15} />
                        <span>{error}</span>
                    </div>
                )}
            </div>
        </Panel>
    )
}
