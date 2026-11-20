/**
 * Formas del asistente de ayuda. Salen de la propuesta de la demo
 * (`docs/experimental/asistente/PROPUESTA_CONTRATO.md` §2), no de V6: el
 * endpoint todavía no es contrato vigente.
 */

/** Quién escribió un mensaje: la persona o el asistente. */
export type HelpRole = 'user' | 'assistant'

export const HELP_ROLES: readonly HelpRole[] = ['user', 'assistant']

/** Un mensaje tal como viaja en el cuerpo del `POST /help/assistant`. */
export interface HelpMessage {
    role: HelpRole
    content: string
}

/** El cuerpo del `POST /help/assistant`. */
export interface AskHelpBody {
    messages: HelpMessage[]
}

/** Una sección del manual en la que se apoya la respuesta. */
export interface HelpSource {
    id: string
    title: string
}

/** Lo que viene dentro de `data`. */
export interface HelpAnswer {
    answer: string
    sources: HelpSource[]
}

/**
 * Un renglón de la conversación en pantalla. Las respuestas traen sus fuentes;
 * las preguntas no. El `id` es sólo para la lista de React.
 */
export interface ChatEntry {
    id: number
    role: HelpRole
    content: string
    sources?: HelpSource[]
}
