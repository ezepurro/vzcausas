import {
    DAY_TYPES,
    JURISDICTIONS,
    type ProceduralStateFormValues,
} from '@/features/legal-params/types/proceduralState';

/** Un mensaje por campo con problema. Objeto vacío = el formulario está bien. */
export type ProceduralStateErrors = Partial<Record<keyof ProceduralStateFormValues, string>>;

const NAME_MIN = 3;
const NAME_MAX = 60;

/** Plazo: entero de 0 a 9999. Es string porque así viaja (ver el tipo). */
const RE_TIME_LIMIT = /^\d{1,4}$/;

/**
 * Validación del formulario de estado procesal.
 *
 * Función pura, sin React: entran los valores y salen los errores. Mientras el
 * equipo no decida lo de `zod`, esta es la forma; el día que entre, cambia el
 * interior de este archivo y no dónde está.
 *
 * Es la PRIMERA barrera, no la única: el backend valida igual y devuelve sus
 * errores campo por campo en los 400.
 */
export function validateProceduralState(
    values: ProceduralStateFormValues,
): ProceduralStateErrors {
    const errors: ProceduralStateErrors = {};

    const name = values.name.trim();
    if (name === '') {
        errors.name = 'El nombre del estado es obligatorio.';
    } else if (name.length < NAME_MIN || name.length > NAME_MAX) {
        errors.name = `Debe tener entre ${NAME_MIN} y ${NAME_MAX} caracteres.`;
    }

    if (!(JURISDICTIONS as readonly string[]).includes(values.jurisdiction)) {
        errors.jurisdiction = 'Elegí un fuero.';
    }

    const timeLimit = values.proceduralTimeLimit.trim();
    if (timeLimit === '') {
        errors.proceduralTimeLimit = 'El plazo es obligatorio.';
    } else if (!RE_TIME_LIMIT.test(timeLimit)) {
        errors.proceduralTimeLimit = 'Debe ser un número entero de 0 a 9999.';
    }

    if (!(DAY_TYPES as readonly string[]).includes(values.dayType)) {
        errors.dayType = 'Elegí cómo se cuentan los días.';
    }

    return errors;
}
