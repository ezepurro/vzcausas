import type { ProceduralStateErrors } from '@/features/legal-params/schemas/proceduralState.schema';
import type { ProceduralStateFormValues } from '@/features/legal-params/types/proceduralState';

/**
 * De los `details` de un 400 a los errores del formulario.
 *
 * El servidor nombra los campos del CONTRATO y el formulario tiene los suyos:
 * `position` es un número allá y un select acá. Además puede mandar claves que
 * no son campos —`body` cuando el PATCH viene vacío—, que no tienen dónde
 * pintarse y se descartan.
 *
 * Sin esta traducción, un error de posición se perdía en silencio: la pantalla
 * casteaba `details` y guardaba una clave que ningún campo lee.
 */
const FIELD_BY_SERVER_NAME: Record<string, keyof ProceduralStateFormValues> = {
    name: 'name',
    position: 'positionChoice',
    timeLimitDays: 'timeLimitDays',
    dayType: 'dayType',
    terminal: 'terminal',
};

export function toFormErrors(details: Record<string, string> | null): ProceduralStateErrors {
    if (!details) return {};

    const errors: ProceduralStateErrors = {};
    for (const [serverName, message] of Object.entries(details)) {
        const field = FIELD_BY_SERVER_NAME[serverName];
        if (field) errors[field] = message;
    }
    return errors;
}

/** `true` si el 400 no trajo ningún error que se pueda mostrar en un campo. */
export function hasNoFieldErrors(errors: ProceduralStateErrors): boolean {
    return Object.keys(errors).length === 0;
}
