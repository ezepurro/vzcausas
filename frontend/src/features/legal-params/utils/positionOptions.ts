import type { SelectOption } from '@/shared/components/forms';
import {
    POSITION_AFTER_PREFIX,
    POSITION_FIRST,
    POSITION_LAST,
    type ProceduralState,
} from '@/features/legal-params/types/proceduralState';

/**
 * El ciclo de vida de un fuero, visto desde el estado que se está tocando.
 *
 * Son los estados ACTIVOS del fuero, en orden y sin el que se edita. Esa lista
 * es la que el backend usa de referencia: al mover un estado lo saca de su
 * lugar y lo inserta en la posición pedida sobre los que quedan, así que las
 * cuentas de acá tienen que hacerse sobre la misma lista o se corren un lugar.
 *
 * En el alta no hay nada que excluir y `editingId` va sin definir.
 */
export function siblingsOf(cycle: ProceduralState[], editingId?: number): ProceduralState[] {
    return cycle
        .filter((state) => state.active && state.id !== editingId)
        .sort((a, b) => a.position - b.position);
}

/**
 * Opciones del select de posición: "Al inicio", un "Después de X" por cada
 * hermano, y "Al final".
 */
export function buildPositionOptions(siblings: ProceduralState[]): SelectOption[] {
    return [
        { value: POSITION_FIRST, label: 'Al inicio del ciclo' },
        ...siblings.map((state) => ({
            value: `${POSITION_AFTER_PREFIX}${state.id}`,
            label: `Después de «${state.name}»`,
        })),
        { value: POSITION_LAST, label: 'Al final del ciclo' },
    ];
}

/**
 * Del valor del select al `position` del contrato.
 *
 * `undefined` significa "al final": el contrato dice que sin `position` el
 * backend lo manda al final del ciclo, así que se omite el campo en vez de
 * calcular un número que el servidor ya sabe.
 *
 * Si el hermano al que se hacía referencia ya no está —se lo dio de baja en
 * otra pestaña entre que se abrió el modal y se confirmó— cae en "al final",
 * que es lo menos sorpresivo: agrega, no reordena a otro lado.
 */
export function resolvePosition(
    choice: string,
    siblings: ProceduralState[],
): number | undefined {
    if (choice === POSITION_FIRST) return 1;
    if (!choice.startsWith(POSITION_AFTER_PREFIX)) return undefined;

    const afterId = Number(choice.slice(POSITION_AFTER_PREFIX.length));
    const index = siblings.findIndex((state) => state.id === afterId);
    if (index === -1) return undefined;

    // +2 y no +1: `index` cuenta desde 0 y las posiciones desde 1, y encima el
    // estado va DETRÁS de ese hermano.
    return index + 2;
}

/**
 * El lugar que ocupa hoy un estado, expresado como valor del select, para
 * precargar el formulario de edición.
 *
 * Se lo nombra por el hermano anterior y no por su número: así, si alguien
 * reordena el ciclo mientras el modal está abierto, "después de «Descargo»"
 * sigue queriendo decir lo mismo.
 */
export function currentPositionChoice(
    state: ProceduralState,
    siblings: ProceduralState[],
): string {
    const previous = siblings.filter((s) => s.position < state.position).at(-1);
    return previous ? `${POSITION_AFTER_PREFIX}${previous.id}` : POSITION_FIRST;
}
