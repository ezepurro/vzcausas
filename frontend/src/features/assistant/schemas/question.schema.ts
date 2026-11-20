/** Tope de caracteres de una pregunta (propuesta §2). */
export const QUESTION_MAX_LENGTH = 2000

/**
 * Valida la pregunta antes de mandarla. Los mismos topes que el backend: así
 * la persona ve el problema en el campo y el `400` no llega nunca. Devuelve el
 * texto del error, o `null` si está bien.
 */
export function validateQuestion(text: string): string | null {
    const trimmed = text.trim()
    if (trimmed.length === 0) return 'Escribí tu pregunta.'
    if (trimmed.length > QUESTION_MAX_LENGTH) {
        return `La pregunta puede tener hasta ${QUESTION_MAX_LENGTH} caracteres.`
    }
    return null
}
