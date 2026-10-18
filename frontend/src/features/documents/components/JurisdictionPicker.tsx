import { useEffect, useId, useRef, useState, type KeyboardEvent } from 'react'
import { JURISDICTION_LABELS, JURISDICTIONS, type Jurisdiction } from '@/features/legal-params'
import { Button, Icon } from '@/shared/components/ui'

export interface JurisdictionPickerProps {
    /** para enlazarlo con la etiqueta de `Field` (`htmlFor`) */
    id?: string
    value: Jurisdiction[]
    onChange: (value: Jurisdiction[]) => void
}

type CheckState = 'on' | 'off' | 'mixed'

/**
 * "Fuero" del alta de modelo formal: un desplegable de selección múltiple con
 * "Todos los fueros" (prototipo, D-55). Cada opción es una casilla de verdad,
 * así el lector de pantalla la anuncia tildada o no.
 *
 * Se cierra con "Listo", con un click afuera o con Escape. El Escape no sube:
 * si no, también cerraría el modal que lo contiene.
 */
export function JurisdictionPicker({ id, value, onChange }: JurisdictionPickerProps) {
    const panelId = useId()
    const [open, setOpen] = useState(false)
    const root = useRef<HTMLDivElement>(null)
    const trigger = useRef<HTMLButtonElement>(null)

    const all: CheckState = value.length === 0 ? 'off' : value.length === JURISDICTIONS.length ? 'on' : 'mixed'

    useEffect(() => {
        if (!open) return
        function onMouseDown(event: MouseEvent) {
            if (!root.current?.contains(event.target as Node)) setOpen(false)
        }
        document.addEventListener('mousedown', onMouseDown)
        return () => document.removeEventListener('mousedown', onMouseDown)
    }, [open])

    // Siempre en el orden del contrato, así el aviso y el cuerpo no dependen del orden del click.
    function set(next: readonly Jurisdiction[]) {
        onChange(JURISDICTIONS.filter((j) => next.includes(j)))
    }

    function toggle(jurisdiction: Jurisdiction) {
        set(value.includes(jurisdiction) ? value.filter((j) => j !== jurisdiction) : [...value, jurisdiction])
    }

    function close() {
        setOpen(false)
        trigger.current?.focus()
    }

    function onKeyDown(event: KeyboardEvent<HTMLDivElement>) {
        if (open && event.key === 'Escape') {
            event.stopPropagation()
            close()
        }
    }

    const summary =
        all === 'off' ? 'Elegí uno o más fueros…'
            : all === 'on' ? 'Todos los fueros'
                : value.map((j) => JURISDICTION_LABELS[j]).join(', ')

    return (
        <div ref={root} className="vz-multi" onKeyDown={onKeyDown}>
            <button
                ref={trigger}
                id={id}
                type="button"
                className={`vz-multi__trigger ${open ? 'is-open' : ''} ${all === 'off' ? 'is-empty' : ''}`}
                aria-haspopup="true"
                aria-expanded={open}
                aria-controls={panelId}
                onClick={() => setOpen((o) => !o)}
            >
                <span className="vz-multi__value">{summary}</span>
                <Icon name="chevronDown" size={14} className="vz-multi__arrow" />
            </button>

            {open && (
                <div id={panelId} className="vz-multi__panel" role="group" aria-label="Fueros">
                    <MultiOption
                        label="Todos los fueros"
                        state={all}
                        strong
                        onToggle={() => set(all === 'on' ? [] : JURISDICTIONS)}
                    />
                    {JURISDICTIONS.map((j) => (
                        <MultiOption
                            key={j}
                            label={JURISDICTION_LABELS[j]}
                            state={value.includes(j) ? 'on' : 'off'}
                            onToggle={() => toggle(j)}
                        />
                    ))}
                    <div className="vz-multi__foot">
                        <Button size="sm" onClick={close}>Listo</Button>
                    </div>
                </div>
            )}
        </div>
    )
}

interface MultiOptionProps {
    label: string
    state: CheckState
    /** el renglón de "Todos", con fondo y en negrita */
    strong?: boolean
    onToggle: () => void
}

/** Un renglón del desplegable: la casilla nativa, escondida, y su caja dibujada. */
function MultiOption({ label, state, strong = false, onToggle }: MultiOptionProps) {
    const input = useRef<HTMLInputElement>(null)

    // "Algunos" no es un atributo de HTML: sólo se puede poner por la propiedad.
    useEffect(() => {
        if (input.current) input.current.indeterminate = state === 'mixed'
    }, [state])

    return (
        <label className={`vz-multi__option ${strong ? 'vz-multi__option--all' : ''} ${state === 'on' ? 'is-on' : ''}`}>
            <input
                ref={input}
                type="checkbox"
                className="vz-sr-only"
                checked={state === 'on'}
                onChange={onToggle}
            />
            <span className={`vz-multi__box is-${state}`} aria-hidden="true">
                {state === 'on' ? '✓' : state === 'mixed' ? '–' : ''}
            </span>
            <span>{label}</span>
        </label>
    )
}
