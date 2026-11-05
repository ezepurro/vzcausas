import { useEffect, useLayoutEffect, useRef, useState, type PointerEvent as ReactPointerEvent } from 'react'
import { Button, LoadingState, Panel, Skeleton } from '@/shared/components/ui'
import { formatInstantDate } from '@/shared/lib/dates'
import type { CaseDocument } from '@/features/cases/types/caseDocument'
import { documentTypeLabel, formatFileSize } from '@/features/cases/utils/caseDocument'

export interface CaseFileDocumentsPanelProps {
    /** Sin carpeta creada no hay documentos que elegir (D-102). */
    folderCreated: boolean
    loading: boolean
    /** El mensaje del servidor si no se pudo leer la carpeta, o `null`. */
    error: string | null
    /** Los incluidos, en el orden del expediente. */
    selected: CaseDocument[]
    /** Los que se ofrecen y no están incluidos ("No incluidos"). */
    excluded: CaseDocument[]
    /** "Elegí al menos un documento." u otro error de `documentIds`. */
    selectionError?: string
    /** `null` si no hay nada que incluir ni quitar. */
    toggleAllLabel: 'Incluir todos' | 'Quitar todos' | null
    onToggleAll: () => void
    onInclude: (id: string) => void
    onRemove: (id: string) => void
    /** `to` es la posición que termina teniendo. Al arrastrar se llama en vivo, varias veces. */
    onMove: (from: number, to: number) => void
    /**
     * Mientras se genera, la lista no se mueve. Los botones los deshabilita el
     * `fieldset` de la página; el arrastre no es un control, así que va acá.
     */
    disabled?: boolean
}

/**
 * La sección "Documentos de la causa" de "Generar expediente" (HU25): los
 * incluidos, en el orden en que se unen, y abajo los que no.
 *
 * El orden se cambia arrastrando la tarjeta desde cualquier parte, como el
 * prototipo, o con "↑" y "↓", que sirven con el teclado (ver
 * `cases/CAMBIOS.md`). Un documento que no se puede convertir a PDF se
 * muestra pero no se incluye: daría `422`.
 */
export function CaseFileDocumentsPanel(props: CaseFileDocumentsPanelProps) {
    const { toggleAllLabel, onToggleAll } = props
    return (
        <Panel
            title="Documentos de la causa"
            actions={
                toggleAllLabel ? (
                    <Button variant="ghost" size="sm" onClick={onToggleAll}>
                        {toggleAllLabel}
                    </Button>
                ) : undefined
            }
        >
            <div className="vz-panel__body vz-casefile__body">
                <Body {...props} />
            </div>
        </Panel>
    )
}

function Body({
    folderCreated,
    loading,
    error,
    selected,
    excluded,
    selectionError,
    onInclude,
    onRemove,
    onMove,
    disabled = false,
}: CaseFileDocumentsPanelProps) {
    const drag = useDragReorder(selected.map((doc) => doc.id), onMove)

    if (!folderCreated) {
        return <p className="vz-docs__note">La carpeta de la causa todavía no está creada en Drive.</p>
    }
    if (error) {
        return <p className="vz-docs__note vz-docs__note--error">{error}</p>
    }
    if (loading) {
        return (
            <LoadingState label="Leyendo la carpeta de Drive…">
                {[0, 1, 2].map((i) => <Skeleton key={i} height={52} />)}
            </LoadingState>
        )
    }
    if (selected.length === 0 && excluded.length === 0) {
        return <p className="vz-docs__note">La causa todavía no tiene documentos cargados.</p>
    }

    return (
        <>
            {selected.length > 0 ? (
                <ol className="vz-casefile__list" aria-label="Documentos incluidos">
                    {selected.map((doc, i) => {
                        const state = doc.id === drag.draggingId ? ' is-dragging' : doc.id === drag.flashId ? ' is-flash' : ''
                        return (
                            <li
                                key={doc.id}
                                ref={drag.rowRef(doc.id)}
                                className={`vz-casefile__item${disabled ? '' : ' vz-casefile__item--draggable'}${state}`}
                                onPointerDown={disabled ? undefined : (e) => drag.grab(e, doc.id)}
                            >
                                <Grip />
                                <span className="vz-casefile__order">{i + 2}</span>
                                <TypeBadge doc={doc} />
                                <DocumentText doc={doc} />
                                <div className="vz-casefile__row-actions">
                                    <Button
                                        variant="ghost"
                                        size="sm"
                                        aria-label={`Subir ${doc.name}`}
                                        disabled={i === 0}
                                        onClick={() => onMove(i, i - 1)}
                                    >
                                        ↑
                                    </Button>
                                    <Button
                                        variant="ghost"
                                        size="sm"
                                        aria-label={`Bajar ${doc.name}`}
                                        disabled={i === selected.length - 1}
                                        onClick={() => onMove(i, i + 1)}
                                    >
                                        ↓
                                    </Button>
                                    <Button
                                        variant="ghost-danger"
                                        size="sm"
                                        aria-label={`Quitar ${doc.name}`}
                                        onClick={() => onRemove(doc.id)}
                                    >
                                        Quitar
                                    </Button>
                                </div>
                            </li>
                        )
                    })}
                </ol>
            ) : (
                <div className="vz-casefile__empty">Agregá documentos desde la lista de abajo.</div>
            )}

            {selectionError && <div className="vz-error">{selectionError}</div>}
            {selected.length > 0 && <span className="vz-casefile__hint">Arrastrá para cambiar el orden.</span>}

            {excluded.length > 0 && (
                <div className="vz-casefile__excluded">
                    <span className="vz-casefile__label">No incluidos</span>
                    <ul className="vz-casefile__list" aria-label="Documentos no incluidos">
                        {excluded.map((doc) => (
                            <li key={doc.id} className="vz-casefile__item vz-casefile__item--excluded">
                                <TypeBadge doc={doc} />
                                <DocumentText doc={doc} />
                                <Button
                                    variant="secondary"
                                    size="sm"
                                    aria-label={`Incluir ${doc.name}`}
                                    disabled={!doc.convertibleToPdf}
                                    onClick={() => onInclude(doc.id)}
                                >
                                    Incluir
                                </Button>
                            </li>
                        ))}
                    </ul>
                </div>
            )}
        </>
    )
}

/* ---------------- arrastrar para ordenar ---------------- */

/** Lo que hay que mover el puntero para que un click pase a ser arrastre. */
const DRAG_THRESHOLD_PX = 4
/** Cuánto queda resaltada la tarjeta después de soltarla. */
const FLASH_MS = 700
const SLIDE = { duration: 200, easing: 'cubic-bezier(.2,.7,.3,1)' }

/** El arrastre en curso. Vive en un ref: cambia en cada movimiento y no tiene que redibujar. */
interface DragState {
    id: string
    startY: number
    /** Dónde está el puntero ahora. */
    y: number
    /** A qué altura de la tarjeta se la agarró. */
    grab: number
    height: number
    /** El `translateY` que lleva la tarjeta respecto de su lugar en la lista. */
    offset: number
    moved: boolean
}

function prefersReducedMotion(): boolean {
    return typeof window.matchMedia === 'function' && window.matchMedia('(prefers-reduced-motion: reduce)').matches
}

/**
 * El arrastre del prototipo (`agarrarExp`), con eventos de puntero: anda
 * igual con mouse y con el dedo.
 *
 * - Se agarra la tarjeta desde cualquier parte menos sus botones, y recién es
 *   arrastre después de `DRAG_THRESHOLD_PX`.
 * - La tarjeta sigue al puntero con `translateY`, puesto directo en el DOM.
 * - El orden cambia en vivo: cuando el centro de la tarjeta pasa la mitad de
 *   otra, se llama a `onMove`. Las demás se deslizan a su lugar nuevo.
 * - Al soltar vuelve a su lugar y queda resaltada un momento.
 *
 * jsdom no calcula posiciones: esto no se puede probar en Vitest. El orden se
 * prueba con "↑" y "↓", que llaman al mismo `onMove`.
 */
function useDragReorder(ids: string[], onMove: (from: number, to: number) => void) {
    const rows = useRef(new Map<string, HTMLLIElement>())
    const positions = useRef(new Map<string, number>())
    const drag = useRef<DragState | null>(null)
    const stopListening = useRef<(() => void) | null>(null)
    const flashTimer = useRef<number | undefined>(undefined)
    /* Los listeners de `window` se arman al agarrar: leen el orden y el
       callback de ahora, no los de ese momento. */
    const current = useRef({ ids, onMove })
    const [draggingId, setDraggingId] = useState<string | null>(null)
    const [flashId, setFlashId] = useState<string | null>(null)

    useLayoutEffect(() => {
        current.current = { ids, onMove }
    })

    /** Lleva la tarjeta arrastrada a la altura del puntero (`posExp`). */
    function follow() {
        const d = drag.current
        const el = d && rows.current.get(d.id)
        if (!d || !el) return
        const slot = el.getBoundingClientRect().top - d.offset
        d.offset = d.y - d.grab - slot
        el.style.transform = `translateY(${d.offset}px)`
    }

    /** Si el centro de la tarjeta pasó a otra posición, la mueve ahí (`reordExp`). */
    function reorder() {
        const d = drag.current
        if (!d) return
        const { ids: order, onMove: move } = current.current
        const from = order.indexOf(d.id)
        if (from < 0) return
        const center = d.y - d.grab + d.height / 2
        let to = 0
        for (const id of order) {
            if (id === d.id) continue
            const rect = rows.current.get(id)?.getBoundingClientRect()
            if (rect && rect.top + rect.height / 2 < center) to += 1
        }
        if (to !== from) move(from, to)
    }

    /** Suelta la tarjeta: vuelve animada a su lugar y queda resaltada (`soltarExp`). */
    function release() {
        const d = drag.current
        drag.current = null
        document.body.style.cursor = ''
        if (!d?.moved) return
        const el = rows.current.get(d.id)
        if (el) {
            el.style.transform = ''
            if (!prefersReducedMotion()) el.animate?.([{ transform: `translateY(${d.offset}px)` }, { transform: 'none' }], SLIDE)
        }
        setDraggingId(null)
        setFlashId(d.id)
        window.clearTimeout(flashTimer.current)
        flashTimer.current = window.setTimeout(() => setFlashId(null), FLASH_MS)
    }

    function grab(e: ReactPointerEvent<HTMLLIElement>, id: string) {
        // Sólo el botón principal, y no desde ↑, ↓ o "Quitar".
        if (e.button !== 0 || (e.target as HTMLElement).closest('button')) return
        const rect = e.currentTarget.getBoundingClientRect()
        drag.current = { id, startY: e.clientY, y: e.clientY, grab: e.clientY - rect.top, height: rect.height, offset: 0, moved: false }

        const move = (ev: PointerEvent) => {
            const d = drag.current
            if (!d) return
            d.y = ev.clientY
            if (!d.moved) {
                if (Math.abs(d.y - d.startY) < DRAG_THRESHOLD_PX) return
                d.moved = true
                document.body.style.cursor = 'grabbing'
                setDraggingId(id)
            }
            ev.preventDefault()
            follow()
            reorder()
        }
        const up = () => {
            stop()
            release()
        }
        const stop = () => {
            window.removeEventListener('pointermove', move)
            window.removeEventListener('pointerup', up)
            window.removeEventListener('pointercancel', up)
            stopListening.current = null
        }
        stopListening.current?.()
        stopListening.current = stop
        window.addEventListener('pointermove', move)
        window.addEventListener('pointerup', up)
        window.addEventListener('pointercancel', up)
    }

    /* Cuando cambia el orden, cada tarjeta se desliza desde donde estaba
       (`animarExp`). La que se arrastra no: se vuelve a poner bajo el puntero
       desde su lugar nuevo. */
    const orderKey = ids.join('|')
    useLayoutEffect(() => {
        const animate = !prefersReducedMotion()
        const next = new Map<string, number>()
        for (const [id, el] of rows.current) {
            const top = el.offsetTop
            next.set(id, top)
            if (drag.current?.moved && drag.current.id === id) {
                el.style.transform = ''
                drag.current.offset = 0
                follow()
                continue
            }
            const before = positions.current.get(id)
            if (animate && before !== undefined && before !== top) {
                el.animate?.([{ transform: `translateY(${before - top}px)` }, { transform: 'none' }], SLIDE)
            }
        }
        positions.current = next
        // `follow` sólo lee refs: alcanza con el orden.
    }, [orderKey])

    // Si la pantalla se va en medio de un arrastre, no quedan listeners ni el cursor cambiado.
    useEffect(() => () => {
        stopListening.current?.()
        window.clearTimeout(flashTimer.current)
        document.body.style.cursor = ''
    }, [])

    /** Registra la tarjeta de cada documento, para medirla y moverla. */
    function rowRef(id: string) {
        return (el: HTMLLIElement | null) => {
            if (!el) return
            rows.current.set(id, el)
            return () => {
                rows.current.delete(id)
            }
        }
    }

    return { draggingId, flashId, grab, rowRef }
}

/* ---------------- piezas de cada tarjeta ---------------- */

/** "PDF", "DOC", "IMG": el mismo tipo que la tarjeta "Documentación". */
function TypeBadge({ doc }: { doc: CaseDocument }) {
    const label = documentTypeLabel(doc)
    return (
        <span className={`vz-casefile__type${label === 'PDF' ? ' vz-casefile__type--pdf' : ''}`} aria-hidden="true">
            {label}
        </span>
    )
}

/** Nombre y "Gestión Estudio · 09/09/2026 · 88 KB · Se convierte a PDF". */
function DocumentText({ doc }: { doc: CaseDocument }) {
    const meta = [doc.uploadedBy, formatInstantDate(doc.createdAt), formatFileSize(doc.sizeBytes)]
        .filter(Boolean)
        .join(' · ')
    const conversion = !doc.convertibleToPdf
        ? 'No se puede convertir a PDF'
        : documentTypeLabel(doc) !== 'PDF'
            ? 'Se convierte a PDF'
            : null

    return (
        <div className="vz-casefile__main">
            <div className="vz-casefile__name" title={doc.name}>{doc.name}</div>
            <div className="vz-casefile__meta">
                {meta}
                {conversion && ` · ${conversion}`}
            </div>
        </div>
    )
}

/** La agarradera de seis puntos del prototipo. Es sólo una señal: se agarra toda la tarjeta. */
function Grip() {
    return (
        <svg className="vz-casefile__grip" width="12" height="18" viewBox="0 0 12 18" aria-hidden="true">
            <g fill="currentColor">
                <circle cx="3" cy="3" r="1.4" />
                <circle cx="9" cy="3" r="1.4" />
                <circle cx="3" cy="9" r="1.4" />
                <circle cx="9" cy="9" r="1.4" />
                <circle cx="3" cy="15" r="1.4" />
                <circle cx="9" cy="15" r="1.4" />
            </g>
        </svg>
    )
}
