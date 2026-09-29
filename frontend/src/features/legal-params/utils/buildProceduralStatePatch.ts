import type {
    DayType,
    ProceduralState,
    ProceduralStateFormValues,
    UpdateProceduralStateBody,
} from '@/features/legal-params/types/proceduralState';
import { resolvePosition } from './positionOptions';

/**
 * Del formulario al cuerpo del PATCH: sólo lo que cambió.
 *
 * Recorta ANTES de comparar, así agregarle un espacio al final a un nombre no
 * cuenta como cambio. Si no cambió nada devuelve `{}` y la pantalla no manda
 * nada: el contrato responde 400 a un PATCH vacío.
 *
 * `jurisdiction` no aparece: el contrato prohíbe cambiar un estado de fuero y
 * el backend rechaza el campo aunque venga con el valor que ya tenía.
 */
export function buildProceduralStatePatch(
    original: ProceduralState,
    values: ProceduralStateFormValues,
    siblings: ProceduralState[],
    /**
     * `false` mientras el usuario no haya tocado el select de posición. Sin
     * esto, reordenar el ciclo sería un efecto secundario de abrir el modal y
     * cambiar cualquier otra cosa.
     */
    positionTouched: boolean,
): UpdateProceduralStateBody {
    const patch: UpdateProceduralStateBody = {};

    const name = values.name.trim();
    if (name !== original.name) patch.name = name;

    const timeLimitDays = Number(values.timeLimitDays.trim());
    if (timeLimitDays !== original.timeLimitDays) patch.timeLimitDays = timeLimitDays;

    if (values.dayType !== original.dayType) patch.dayType = values.dayType as DayType;

    if (values.terminal !== original.terminal) patch.terminal = values.terminal;

    /* La posición se compara por el LUGAR que ocupa entre los hermanos, no por
       el texto del select: "al final" y "después del último" son el mismo lugar
       dicho de dos formas, y mandarlo igual haría que un PATCH sin cambios
       reordenara el ciclo al pedo. */
    if (positionTouched) {
        const lastSlot = siblings.length + 1;
        const target = resolvePosition(values.positionChoice, siblings) ?? lastSlot;
        const currentSlot = siblings.filter((s) => s.position < original.position).length + 1;
        if (target !== currentSlot) patch.position = target;
    }

    return patch;
}

/** `true` si no quedó nada para mandar. */
export function isEmptyPatch(patch: UpdateProceduralStateBody): boolean {
    return Object.keys(patch).length === 0;
}
