import type {
    DayType,
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
 *
 * `jurisdiction` no aparece: un estado no cambia de fuero (V3 D-36) y el
 * backend rechaza el campo aunque venga con el valor que ya tenía.
 */
export function buildProceduralStatePatch(
    original: ProceduralState,
    values: ProceduralStateFormValues,
): UpdateProceduralStateBody {
    const patch: UpdateProceduralStateBody = {};

    const name = values.name.trim();
    if (name !== original.name) patch.name = name;

    const timeLimitDays = Number(values.timeLimitDays.trim());
    if (timeLimitDays !== original.timeLimitDays) patch.timeLimitDays = timeLimitDays;

    if (values.dayType !== original.dayType) patch.dayType = values.dayType as DayType;

    if (values.terminal !== original.terminal) patch.terminal = values.terminal;

    return patch;
}

/** `true` si no quedó nada para mandar. */
export function isEmptyPatch(patch: UpdateProceduralStateBody): boolean {
    return Object.keys(patch).length === 0;
}
