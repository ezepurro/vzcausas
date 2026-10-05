import type { ProceduralStateErrors } from '@/features/legal-params/schemas/proceduralState.schema';
import type { ProceduralStateFormValues } from '@/features/legal-params/types/proceduralState';

/**
 * De los `details` de un 400 a los errores del formulario.
 *
 * El servidor nombra los campos del CONTRATO, y puede mandar claves que no son
 * campos del formulario —`body` cuando el PATCH viene vacío, `jurisdiction`,
 * que acá no se edita—. Esas no tienen dónde pintarse y se descartan, para que
 * la pantalla sepa que el error no quedó a la vista y lo avise de otro modo.
 */
const FIELD_BY_SERVER_NAME: Record<string, keyof ProceduralStateFormValues> = {
    name: 'name',
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
