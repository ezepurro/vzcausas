import type {
    DayType,
    Jurisdiction,
    ProceduralState,
    ProceduralStateFormValues,
    UpdateProceduralStateBody,
} from '@/features/legal-params/types/proceduralState';

/**
 * Del formulario al cuerpo del PATCH: sólo lo que cambió.
 *
 * Recorta ANTES de comparar, así agregarle un espacio al final a un nombre no
 * cuenta como cambio. Si no cambió nada devuelve `{}` y la pantalla no manda
 * nada: el contrato responde 400 a un PATCH vacío.
 */
export function buildProceduralStatePatch(
    original: ProceduralState,
    values: ProceduralStateFormValues,
): UpdateProceduralStateBody {
    const patch: UpdateProceduralStateBody = {};

    const name = values.name.trim();
    if (name !== original.name) patch.name = name;

    if (values.jurisdiction !== original.jurisdiction) {
        patch.jurisdiction = values.jurisdiction as Jurisdiction;
    }

    const timeLimit = values.proceduralTimeLimit.trim();
    if (timeLimit !== original.proceduralTimeLimit) patch.proceduralTimeLimit = timeLimit;

    if (values.dayType !== original.dayType) patch.dayType = values.dayType as DayType;

    return patch;
}

/** `true` si no quedó nada para mandar. */
export function isEmptyPatch(patch: UpdateProceduralStateBody): boolean {
    return Object.keys(patch).length === 0;
}
