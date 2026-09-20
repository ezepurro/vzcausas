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
 * `validateProceduralState` ya dijo que los valores sirven. Por eso las
 * aserciones de abajo son seguras — el formulario los maneja como `string`
 * sueltos sólo porque es lo que admite `FormValues`.
 */
export function toCreateProceduralStateBody(
    values: ProceduralStateFormValues,
): CreateProceduralStateBody {
    return {
        name: values.name.trim(),
        jurisdiction: values.jurisdiction as Jurisdiction,
        proceduralTimeLimit: values.proceduralTimeLimit.trim(),
        dayType: values.dayType as DayType,
    };
}
