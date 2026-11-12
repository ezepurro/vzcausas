/*
 * Corta después de un punto (o de ! y ?) seguido de espacio y mayúscula: así
 * "Debe tener al menos 8 caracteres. Debe incluir al menos un número." son dos
 * oraciones, pero "art. 162 CP" o "1-28114." no se parten.
 */
const SENTENCE_BREAK = /(?<=[.!?])\s+(?=[A-ZÁÉÍÓÚÑ¿¡])/;

/**
 * Las oraciones de un mensaje de error, sin vacíos. El backend junta en un
 * solo texto todos los mensajes que fallan sobre un mismo campo
 * (`backend/src/app.setup.ts`, `flatten`); `FieldError` pinta cada una en su
 * línea.
 */
export function splitErrorMessage(message: string): string[] {
  return message.split(SENTENCE_BREAK).map((s) => s.trim()).filter(Boolean);
}
