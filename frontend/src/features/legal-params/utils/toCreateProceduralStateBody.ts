import type {
    CreateProceduralStateBody,
    DayType,
    Jurisdiction,
    ProceduralStateFormValues,
} from '@/features/legal-params/types/proceduralState';

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
 * No hay posición que mandar: los estados no tienen orden (V3 D-31).
 */
export function toCreateProceduralStateBody(
    values: ProceduralStateFormValues,
    jurisdiction: Jurisdiction,
): CreateProceduralStateBody {
    return {
        name: values.name.trim(),
        jurisdiction,
        // El contrato los quiere como números, no como el texto del input.
        timeLimitDays: Number(values.timeLimitDays.trim()),
        dayType: values.dayType as DayType,
        terminal: values.terminal,
    };
}
