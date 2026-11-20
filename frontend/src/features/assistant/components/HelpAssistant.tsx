import { useCallback, useRef, useState } from 'react'

import { Button } from '@/shared/components/ui'
import { AssistantAvatar } from '@/features/assistant/components/AssistantAvatar'
import { HelpPanel } from '@/features/assistant/components/HelpPanel'
import type { ChatEntry } from '@/features/assistant/types/assistant'

/**
 * El botón "Asistente" de la barra superior y su panel. La conversación vive
 * acá y no en el panel: cerrarlo y volver a abrirlo la conserva hasta que se
 * recarga la página (no se guarda en ningún lado, propuesta §2).
 */
export function HelpAssistant() {
    const [open, setOpen] = useState(false)
    const [entries, setEntries] = useState<ChatEntry[]>([])
    // `Button` no reenvía `ref`: el contenedor sirve para devolverle el foco.
    const anchor = useRef<HTMLSpanElement>(null)

    const close = useCallback(() => {
        setOpen(false)
        anchor.current?.querySelector('button')?.focus()
    }, [])

    return (
        <span ref={anchor} className="vz-help-anchor">
            <Button
                variant="secondary"
                size="md"
                className="vz-help-trigger"
                icon={<AssistantAvatar size={24} />}
                aria-expanded={open}
                pressed={open}
                onClick={() => (open ? close() : setOpen(true))}
            >
                Asistente
            </Button>
            {open && <HelpPanel entries={entries} onEntriesChange={setEntries} onClose={close} />}
        </span>
    )
}
