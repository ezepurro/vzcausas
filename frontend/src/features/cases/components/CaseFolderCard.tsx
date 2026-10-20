import { Button, Icon, Panel, Pill, type PillTone } from '@/shared/components/ui'
import type { CaseFolder, CaseFolderStatus } from '@/features/cases/types/case'
import { copiedTemplatesText, splitFolderPath } from '@/features/cases/utils/caseFolder'

export interface CaseFolderCardProps {
    /** `null` en las causas registradas antes de V4. */
    folder: CaseFolder | null
    /** Pidiendo la carpeta: el botón se deshabilita. */
    creating: boolean
    /** El mensaje del último intento fallido, o `null`. */
    error: string | null
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

/**
 * La tarjeta "Carpeta en Drive" del detalle de la causa (HU39, HU40).
 *
 * Arriba, la carpeta: su nombre (la carátula) y dónde está (abogado › fuero).
 * Debajo, en qué situación está y qué se puede hacer. Con la carpeta creada,
 * la abre en otra pestaña. Si no la tiene (`null` o `PENDING`) ofrece crearla,
 * y si falló, reintentarla: las dos van por `POST /cases/{caseId}/folder`, que
 * además copia los modelos que faltaban. Mientras se crea no hay nada que
 * hacer. Lo puede usar cualquier perfil, igual que el alta de la causa.
 *
 * El botón no está en el prototipo (V4 §3.7).
 */
export function CaseFolderCard({ folder, creating, error, onCreate }: CaseFolderCardProps) {
    const view: FolderView = folder?.status ?? 'NONE'
    const { label, tone, note } = VIEW[view]
    const canCreate = view === 'NONE' || view === 'PENDING' || view === 'ERROR'
    const location = folder ? splitFolderPath(folder.path) : null
    const created = folder?.status === 'CREATED' ? folder : null
    const copied = created ? copiedTemplatesText(created) : null
    const missing = created?.templatesPending ?? 0

    return (
        <Panel title="Carpeta en Drive">
            <div className={`vz-panel__body vz-case-folder vz-case-folder--${view.toLowerCase()}`}>
                <div className="vz-case-folder__head">
                    <span className="vz-case-folder__icon">
                        <Icon name={view === 'ERROR' ? 'alert' : 'folder'} size={20} />
                    </span>
                    <div className="vz-case-folder__id">
                        <div className="vz-case-folder__name" title={folder?.path}>
                            {location ? location.name : 'Sin carpeta en Drive'}
                        </div>
                        {location && location.parents.length > 0 && (
                            <div className="vz-case-folder__where">
                                {location.parents.map((p, i) => (
                                    <span key={p}>
                                        {i > 0 && <span className="vz-case-folder__sep" aria-hidden="true">›</span>}
                                        {p}
                                    </span>
                                ))}
                            </div>
                        )}
                    </div>
                </div>

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
                {canCreate && (
                    <Button
                        size="sm"
                        block
                        variant={view === 'ERROR' ? 'secondary' : 'primary'}
                        icon={<Icon name={view === 'ERROR' ? 'forward' : 'plus'} size={14} />}
                        disabled={creating}
                        onClick={onCreate}
                    >
                        {view === 'ERROR' ? 'Reintentar' : 'Crear carpeta'}
                    </Button>
                )}
                {error && (
                    <div className="vz-case-folder__error" role="alert">
                        <Icon name="alert" size={15} />
                        <span>{error}</span>
                    </div>
                )}
            </div>
        </Panel>
    )
}
