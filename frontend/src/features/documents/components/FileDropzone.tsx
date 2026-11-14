import { useState } from 'react'
import { Icon } from '@/shared/components/ui'
import { formatFileSize } from '@/features/documents/utils/templateFormat'

export interface FileDropzoneProps {
    /** para enlazarlo con la etiqueta de `Field` (`htmlFor`) */
    id?: string
    /** el archivo elegido; `null` si todavía no se eligió ninguno */
    file: File | null
    /**
     * El nombre del archivo que ya tiene el modelo, en "Modificar modelo
     * formal" (HU36): se ve mientras no se elija otro. En el alta no se pasa.
     */
    currentFileName?: string
    /** el `accept` del input: ".docx,application/…" */
    accept: string
    /** lo que se lee: "Solo .docx, hasta 10 MB" */
    acceptText: string
    onChange: (file: File | null) => void
}

/**
 * "Archivo del modelo" (prototipo): una zona para arrastrar el archivo o
 * elegirlo. El input de archivo de verdad la cubre entera, transparente, así
 * el click abre el selector del sistema sin código propio. No valida: el tipo
 * y el tamaño los revisa el schema.
 */
export function FileDropzone({ id, file, currentFileName, accept, acceptText, onChange }: FileDropzoneProps) {
    const [dragging, setDragging] = useState(false)
    /* Lo que se muestra: el archivo nuevo si se eligió uno; si no, el actual. */
    const shownName = file?.name ?? currentFileName
    const extension = shownName?.split('.').pop()?.toUpperCase() ?? ''

    return (
        <div
            className={`vz-dropzone ${dragging ? 'is-dragging' : ''} ${shownName ? 'has-file' : ''}`}
            onDragOver={(e) => {
                e.preventDefault()
                setDragging(true)
            }}
            onDragLeave={() => setDragging(false)}
            onDrop={(e) => {
                e.preventDefault()
                setDragging(false)
                onChange(e.dataTransfer.files[0] ?? null)
            }}
        >
            <input
                id={id}
                type="file"
                accept={accept}
                title="Elegir archivo"
                className="vz-dropzone__input"
                onChange={(e) => onChange(e.target.files?.[0] ?? null)}
            />

            {shownName ? (
                <div className="vz-dropzone__file">
                    <span className="vz-dropzone__badge" aria-hidden="true">{extension}</span>
                    <div className="vz-dropzone__info">
                        <div className="vz-dropzone__name">{shownName}</div>
                        <div className="vz-dropzone__meta">
                            {file ? `${formatFileSize(file.size)} · Listo para subir` : 'Archivo actual'}
                        </div>
                    </div>
                    {/* Visual: el click lo recibe el input que cubre la zona. */}
                    <span className="vz-dropzone__change" aria-hidden="true">Cambiar</span>
                </div>
            ) : (
                <>
                    <Icon name="upload" size={22} className="vz-dropzone__icon" />
                    <div className="vz-dropzone__title">Arrastrá el archivo acá</div>
                    <div className="vz-dropzone__hint">
                        o <span className="vz-dropzone__link">elegilo desde la computadora</span> · {acceptText}
                    </div>
                </>
            )}
        </div>
    )
}