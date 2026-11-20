import { describe, expect, it } from 'vitest'

import { ApiError } from '@/shared/api/ApiError'
import { errorMessage, MAX_MESSAGES_PER_REQUEST, toRequestMessages } from '@/features/assistant/utils/conversation'
import { validateQuestion } from '@/features/assistant/schemas/question.schema'
import { boldSegments } from '@/features/assistant/utils/boldSegments'
import type { ChatEntry } from '@/features/assistant/types/assistant'

const entry = (id: number, role: ChatEntry['role']): ChatEntry => ({
    id,
    role,
    content: `${role} ${id}`,
    sources: role === 'assistant' ? [] : undefined,
})

describe('toRequestMessages', () => {
    it('manda la conversación sin fuentes ni ids', () => {
        expect(toRequestMessages([entry(0, 'user'), entry(1, 'assistant'), entry(2, 'user')])).toEqual([
            { role: 'user', content: 'user 0' },
            { role: 'assistant', content: 'assistant 1' },
            { role: 'user', content: 'user 2' },
        ])
    })

    it('manda sólo los últimos 20 y nunca empieza con una respuesta', () => {
        const entries = Array.from({ length: 25 }, (_, i) => entry(i, i % 2 === 0 ? 'user' : 'assistant'))

        const sent = toRequestMessages(entries)

        expect(sent.length).toBeLessThanOrEqual(MAX_MESSAGES_PER_REQUEST)
        expect(sent[0].role).toBe('user')
        expect(sent[sent.length - 1]).toEqual({ role: 'user', content: 'user 24' })
    })
})

describe('boldSegments', () => {
    it('separa los tramos en negrita y deja el resto como texto', () => {
        expect(boldSegments('Usá **Nueva causa** o **Registrar causa**.')).toEqual([
            { text: 'Usá ', bold: false },
            { text: 'Nueva causa', bold: true },
            { text: ' o ', bold: false },
            { text: 'Registrar causa', bold: true },
            { text: '.', bold: false },
        ])
    })

    it('un ** sin cerrar queda como texto', () => {
        expect(boldSegments('Hola **mundo')).toEqual([{ text: 'Hola **mundo', bold: false }])
    })
})

describe('validateQuestion', () => {
    it.each([
        ['', 'Escribí tu pregunta.'],
        ['   ', 'Escribí tu pregunta.'],
        ['a'.repeat(2001), 'La pregunta puede tener hasta 2000 caracteres.'],
        ['¿Cómo registro una causa?', null],
    ])('%j → %j', (text, expected) => {
        expect(validateQuestion(text)).toBe(expected)
    })
})

describe('errorMessage', () => {
    it('429 dice cuántos segundos esperar', () => {
        const error = new ApiError(429, 'x', 'TOO_MANY_REQUESTS', null, 35)

        expect(errorMessage(error)).toBe('Hiciste muchas preguntas seguidas. Probá de nuevo en 35 segundos.')
    })

    it('502 y la red caída dicen que el asistente no está', () => {
        const expected = 'El asistente no está disponible en este momento. Intentá de nuevo en unos minutos.'

        expect(errorMessage(new ApiError(502, 'x', 'ASSISTANT_UNAVAILABLE'))).toBe(expected)
        expect(errorMessage(new ApiError(0, 'x'))).toBe(expected)
    })

    it('el resto usa el mensaje del servidor', () => {
        expect(errorMessage(new ApiError(400, 'Los datos enviados no son válidos.', 'VALIDATION_ERROR'))).toBe(
            'Los datos enviados no son válidos.',
        )
    })
})
