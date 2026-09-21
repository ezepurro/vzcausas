import type {
    CreateProceduralStateBody,
    DayType,
    Jurisdiction,
    ProceduralState,
    ProceduralStateFormValues,
} from '@/features/legal-params/types/proceduralState';
import { resolvePosition } from './positionOptions';

/**
 * Del formulario al cuerpo del POST.
 *
 * Recorta espacios y no valida: para cuando se la llama,
 * `validateProceduralState` ya dijo que los valores sirven. Por eso la
 * aserción de `dayType` es segura — el formulario lo maneja como `string`
 * suelto sólo porque es lo que admite `FormValues`.
 *
 * El fuero entra por parámetro y no por el formulario: lo fija la lengüeta
 * activa de la pantalla.
 *
 * `position` se omite cuando va al final, porque el contrato dice que sin ese
 * campo el backend lo manda al final. Mandar un número calculado acá sería
 * repetir una cuenta que el servidor hace mejor.
 */
export function toCreateProceduralStateBody(
    values: ProceduralStateFormValues,
    jurisdiction: Jurisdiction,
    siblings: ProceduralState[],
): CreateProceduralStateBody {
    const position = resolvePosition(values.positionChoice, siblings);

    return {
        name: values.name.trim(),
        jurisdiction,
        // El contrato los quiere como números, no como el texto del input.
        timeLimitDays: Number(values.timeLimitDays.trim()),
        dayType: values.dayType as DayType,
        terminal: values.terminal,
        ...(position === undefined ? {} : { position }),
    };
}
