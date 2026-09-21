import {
    DAY_TYPES,
    POSITION_AFTER_PREFIX,
    POSITION_FIRST,
    POSITION_LAST,
    type ProceduralState,
    type ProceduralStateFormValues,
} from '@/features/legal-params/types/proceduralState';

/** Un mensaje por campo con problema. Objeto vacío = el formulario está bien. */
export type ProceduralStateErrors = Partial<Record<keyof ProceduralStateFormValues, string>>;

const NAME_MIN = 3;
const NAME_MAX = 80;

/** Plazo: entero de 0 a 9999. Es string porque es lo que devuelve el input. */
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
 *
 * `siblings` son los estados del fuero contra los que se resuelve la posición
 * elegida: sin ellos no se puede saber si el "después de X" apunta a algo que
 * todavía existe.
 */
export function validateProceduralState(
    values: ProceduralStateFormValues,
    siblings: ProceduralState[],
): ProceduralStateErrors {
    const errors: ProceduralStateErrors = {};

    const name = values.name.trim();
    if (name === '') {
        errors.name = 'El nombre del estado es obligatorio.';
    } else if (name.length < NAME_MIN || name.length > NAME_MAX) {
        errors.name = `Debe tener entre ${NAME_MIN} y ${NAME_MAX} caracteres.`;
    }

    if (!isValidPositionChoice(values.positionChoice, siblings)) {
        errors.positionChoice = 'Elegí en qué lugar del ciclo va el estado.';
    }

    const timeLimit = values.timeLimitDays.trim();
    if (timeLimit === '') {
        errors.timeLimitDays = 'El plazo es obligatorio. Poné 0 si el estado no abre plazo.';
    } else if (!RE_TIME_LIMIT.test(timeLimit)) {
        errors.timeLimitDays = 'Debe ser un número entero de 0 a 9999.';
    }

    if (!(DAY_TYPES as readonly string[]).includes(values.dayType)) {
        errors.dayType = 'Elegí cómo se cuentan los días.';
    } else if (errors.timeLimitDays === undefined) {
        /* La regla del contrato: `NONE` si y sólo si el plazo es 0. Se chequea
           acá y no sólo en el backend porque el formulario esconde el select
           cuando el plazo es 0, y un valor viejo colgado ahí daría un 400 que
           el usuario no podría relacionar con nada que vea en pantalla. */
        const opensNoTimeLimit = Number(timeLimit) === 0;
        if (opensNoTimeLimit && values.dayType !== 'NONE') {
            errors.dayType = 'Un estado con plazo 0 no abre plazo: no se cuentan días.';
        } else if (!opensNoTimeLimit && values.dayType === 'NONE') {
            errors.dayType = 'Indicá si los días son hábiles o corridos.';
        }
    }

    return errors;
}

/** `FIRST`, `LAST`, o un `AFTER:<id>` que apunte a un estado que sigue en el ciclo. */
function isValidPositionChoice(choice: string, siblings: ProceduralState[]): boolean {
    if (choice === POSITION_FIRST || choice === POSITION_LAST) return true;
    if (!choice.startsWith(POSITION_AFTER_PREFIX)) return false;

    const afterId = Number(choice.slice(POSITION_AFTER_PREFIX.length));
    return siblings.some((state) => state.id === afterId);
}
