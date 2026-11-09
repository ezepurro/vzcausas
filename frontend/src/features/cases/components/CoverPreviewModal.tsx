import { useEffect, useRef, type MouseEvent } from 'react'
import { LoadingState, Skeleton } from '@/shared/components/ui'

export interface CoverPreviewModalProps {
    /** El PDF de `GET /cases/{caseId}/cover`. `undefined` mientras no llega. */
    file: Blob | undefined
    loading: boolean
    /** El mensaje del servidor si no se pudo generar, o `null`. */
    error: string | null
    onClose: () => void
}

const TITLE = 'Vista previa de la carátula · hoja 1 del expediente'

/**
 * "Vista previa de la carátula · hoja 1 del expediente" (HU24), como la del
 * prototipo: la hoja sola, centrada sobre el fondo oscuro, con "Cerrar"
 * arriba. No usa `Modal` de shared porque no es un diálogo con cuerpo y pie,
 * pero se porta igual: Escape y el fondo la cierran, el foco entra y vuelve,
 * y la página de atrás no se mueve.
 *
 * La hoja es el PDF que arma el backend, el mismo que va como hoja 1 del
 * expediente (D-94), sin las observaciones ni la parte penal: ésas se suman al
 * generar. El front no la dibuja (ver `cases/CAMBIOS.md`).
 */
export function CoverPreviewModal({ file, loading, error, onClose }: CoverPreviewModalProps) {
    const close = useRef<HTMLButtonElement>(null)
    /* Cierra con un click en el fondo sólo si el gesto empezó ahí, como `Modal`. */
    const pressedBackdrop = useRef(false)

    // Escape cierra; el tabulador no sale de la vista previa: lo único que se opera es "Cerrar".
    useEffect(() => {
        function onKeyDown(event: KeyboardEvent) {
            if (event.key === 'Escape') onClose()
            else if (event.key === 'Tab') {
                event.preventDefault()
                close.current?.focus()
            }
        }
        document.addEventListener('keydown', onKeyDown)
        return () => document.removeEventListener('keydown', onKeyDown)
    }, [onClose])

    // Al abrir, el foco va a "Cerrar"; al cerrar, vuelve a "Vista previa". La página de atrás no scrollea.
    useEffect(() => {
        const opener = document.activeElement
        const overflow = document.body.style.overflow
        close.current?.focus()
        document.body.style.overflow = 'hidden'
        return () => {
            document.body.style.overflow = overflow
            if (opener instanceof HTMLElement) opener.focus()
        }
    }, [])

    function handleMouseDown(event: MouseEvent<HTMLDivElement>) {
        pressedBackdrop.current = event.target === event.currentTarget
    }

    function handleClick(event: MouseEvent<HTMLDivElement>) {
        if (event.target === event.currentTarget && pressedBackdrop.current) onClose()
    }

    let sheet
    if (error) {
        sheet = <p className="vz-cover-preview__error">{error}</p>
    } else if (loading || !file) {
        sheet = (
            <LoadingState label="Generando la carátula…">
                <Skeleton height="100%" />
            </LoadingState>
        )
    } else {
        sheet = <PdfFrame file={file} title="Carátula de la causa en PDF" />
    }

    return (
        <div className="vz-cover-preview" onMouseDown={handleMouseDown} onClick={handleClick}>
            <div className="vz-cover-preview__dialog" role="dialog" aria-modal="true" aria-label={TITLE}>
                <div className="vz-cover-preview__head">
                    <span className="vz-cover-preview__title">{TITLE}</span>
                    <button ref={close} type="button" className="vz-cover-preview__close" onClick={onClose}>
                        Cerrar
                    </button>
                </div>
                <div className="vz-cover-preview__sheet">{sheet}</div>
            </div>
        </div>
    )
}

/**
 * Los parámetros del visor de PDF de Chrome y Edge: sin barra de herramientas
 * ni panel lateral, y la hoja entera ajustada al marco. Firefox ignora casi
 * todos, y ahí se sigue viendo su barra.
 */
const VIEWER_PARAMS = '#toolbar=0&navpanes=0&scrollbar=0&view=Fit'

/**
 * Muestra un PDF que ya se bajó con `http`. La URL temporal del archivo se le
 * pone al iframe desde el efecto y se libera al cambiar de archivo o al
 * cerrar: no pasa por el estado, así que no hay un render de más.
 */
function PdfFrame({ file, title }: { file: Blob; title: string }) {
    const frame = useRef<HTMLIFrameElement>(null)

    useEffect(() => {
        // jsdom (los tests) no implementa createObjectURL.
        if (!frame.current || typeof URL.createObjectURL !== 'function') return
        const url = URL.createObjectURL(file)
        frame.current.src = url + VIEWER_PARAMS
        return () => URL.revokeObjectURL(url)
    }, [file])

    return <iframe ref={frame} className="vz-cover-preview__frame" title={title} />
}
