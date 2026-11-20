import { useEffect, useId, useRef, useState, type FormEvent, type KeyboardEvent } from 'react'

import { Button, IconButton } from '@/shared/components/ui'
import { controlA11y, Field, fieldIds, Textarea } from '@/shared/components/forms'
import { useAskHelpAssistant } from '@/features/assistant/api/useAskHelpAssistant'
import { QUESTION_MAX_LENGTH, validateQuestion } from '@/features/assistant/schemas/question.schema'
import { errorMessage, toRequestMessages } from '@/features/assistant/utils/conversation'
import { boldSegments } from '@/features/assistant/utils/boldSegments'
import { AssistantAvatar } from '@/features/assistant/components/AssistantAvatar'
import type { ChatEntry } from '@/features/assistant/types/assistant'

export interface HelpPanelProps {
    /** La conversación vive en `HelpAssistant`, así cerrar el panel no la borra. */
    entries: ChatEntry[]
    onEntriesChange: (entries: ChatEntry[]) => void
    onClose: () => void
}

/**
 * El panel lateral del asistente de ayuda. No es modal: queda a la derecha sin
 * tapar la pantalla, para seguir las instrucciones mientras se leen. Escape lo
 * cierra.
 */
export function HelpPanel({ entries, onEntriesChange, onClose }: HelpPanelProps) {
    const titleId = useId()
    const fieldId = useId()
    const [question, setQuestion] = useState('')
    const [fieldError, setFieldError] = useState<string | null>(null)
    const ask = useAskHelpAssistant()
    const form = useRef<HTMLFormElement>(null)
    const list = useRef<HTMLOListElement>(null)
    const nextId = useRef(entries.length)

    // Al abrir, el foco va al campo de la pregunta.
    useEffect(() => focusQuestion(), [])

    function focusQuestion() {
        form.current?.querySelector('textarea')?.focus()
    }

    // Cada mensaje nuevo queda a la vista.
    useEffect(() => {
        list.current?.lastElementChild?.scrollIntoView?.({ block: 'nearest' })
    }, [entries.length, ask.isPending])

    function send(event?: FormEvent) {
        event?.preventDefault()
        if (ask.isPending) return

        const error = validateQuestion(question)
        setFieldError(error)
        if (error) {
            focusQuestion()
            return
        }

        const withQuestion: ChatEntry[] = [
            ...entries,
            { id: nextId.current++, role: 'user', content: question.trim() },
        ]
        onEntriesChange(withQuestion)
        setQuestion('')

        ask.mutate(
            { messages: toRequestMessages(withQuestion) },
            {
                onSuccess: ({ answer, sources }) =>
                    onEntriesChange([
                        ...withQuestion,
                        { id: nextId.current++, role: 'assistant', content: answer, sources },
                    ]),
            },
        )
    }

    function onKeyDown(event: KeyboardEvent<HTMLElement>) {
        if (event.key === 'Escape') {
            event.stopPropagation()
            onClose()
        }
    }

    // Enter manda; Shift+Enter hace un salto de línea.
    function onQuestionKeyDown(event: KeyboardEvent<HTMLTextAreaElement>) {
        if (event.key === 'Enter' && !event.shiftKey) {
            event.preventDefault()
            send()
        }
    }

    return (
        <aside className="vz-help" aria-labelledby={titleId} onKeyDown={onKeyDown}>
            <header className="vz-help__head">
                <AssistantAvatar size={40} />
                <div className="vz-help__heading">
                    <h2 id={titleId} className="vz-help__title">Asistente de ayuda</h2>
                    <p className="vz-help__subtitle">Del estudio Vázquez &amp; Zárate</p>
                </div>
                <IconButton name="close" label="Cerrar el asistente" onClick={onClose} />
            </header>

            <p className="vz-help__notice">
                Demo: responde a partir del manual de uso. No escribas datos de causas ni de clientes.
            </p>

            <ol ref={list} className="vz-help__log" aria-live="polite" aria-label="Conversación">
                {entries.length === 0 && (
                    <li className="vz-help__empty">
                        <AssistantAvatar size={64} />
                        <p className="vz-help__greeting">¡Hola! Soy el asistente del estudio.</p>
                        <p>
                            Preguntame cómo se hace algo en VZ Causas. Por ejemplo: «¿Cómo registro una causa sin
                            número de SAC?»
                        </p>
                    </li>
                )}
                {entries.map((entry) => (
                    <li key={entry.id} className={`vz-help__msg vz-help__msg--${entry.role}`}>
                        <span className="vz-sr-only">{entry.role === 'user' ? 'Vos:' : 'Asistente:'}</span>
                        <p className="vz-help__text">
                            {entry.role === 'assistant'
                                ? boldSegments(entry.content).map((segment, index) =>
                                      segment.bold ? <strong key={index}>{segment.text}</strong> : segment.text,
                                  )
                                : entry.content}
                        </p>
                        {entry.sources && entry.sources.length > 0 && (
                            <ul className="vz-help__sources" aria-label="Secciones del manual">
                                {entry.sources.map((source) => (
                                    <li key={source.id} className="vz-help__source">{source.title}</li>
                                ))}
                            </ul>
                        )}
                        {entry.sources && entry.sources.length === 0 && (
                            <p className="vz-help__unsourced">Sin respaldo en el manual.</p>
                        )}
                    </li>
                ))}
                {ask.isPending && (
                    <li className="vz-help__msg vz-help__msg--assistant vz-help__msg--pending">
                        <p className="vz-help__text">Buscando en el manual…</p>
                    </li>
                )}
            </ol>

            {ask.isError && (
                <p className="vz-help__error" role="alert">{errorMessage(ask.error)}</p>
            )}

            <form ref={form} className="vz-help__form" onSubmit={send} noValidate>
                <Field
                    label="Tu pregunta"
                    htmlFor={fieldId}
                    hint={`${question.length} / ${QUESTION_MAX_LENGTH}`}
                    error={fieldError ?? undefined}
                    {...fieldIds(fieldId)}
                >
                    <Textarea
                        id={fieldId}
                        rows={3}
                        maxLength={QUESTION_MAX_LENGTH}
                        value={question}
                        {...controlA11y(fieldId, fieldError ?? undefined)}
                        onChange={(event) => {
                            setQuestion(event.target.value)
                            if (fieldError) setFieldError(null)
                        }}
                        onKeyDown={onQuestionKeyDown}
                    />
                </Field>
                <Button type="submit" size="md" disabled={ask.isPending}>
                    {ask.isPending ? 'Enviando…' : 'Enviar'}
                </Button>
            </form>
        </aside>
    )
}
