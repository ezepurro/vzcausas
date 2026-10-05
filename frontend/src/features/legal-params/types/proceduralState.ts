/**
 * Las formas del estado procesal, sacadas del contrato (§3.4).
 *
 * Los valores cerrados van como arreglo tipado y como unión derivada de él: si
 * el contrato agrega un fuero, se toca una sola línea y todo lo que discrimine
 * sobre la unión deja de compilar hasta contemplarlo.
 */

/** Orden del contrato (§2). Es también el orden de las lengüetas. */
export const JURISDICTIONS = ['CRIMINAL', 'ADMINISTRATIVE', 'AMPARO'] as const;
export type Jurisdiction = (typeof JURISDICTIONS)[number];

/** Rótulos de pantalla. Ver `docs/TRADUCCION_DOMINIO.md`. */
export const JURISDICTION_LABELS: Record<Jurisdiction, string> = {
    CRIMINAL: 'Penal',
    ADMINISTRATIVE: 'Administrativo',
    AMPARO: 'Amparo',
};

/**
 * `NONE` no es "ninguno de los otros dos": es el tipo de día de los estados que
 * no abren plazo. El contrato lo ata a `timeLimitDays`: vale `NONE` si y sólo
 * si el plazo es `0`.
 */
export const DAY_TYPES = ['BUSINESS', 'CONSECUTIVE', 'NONE'] as const;
export type DayType = (typeof DAY_TYPES)[number];

export const DAY_TYPE_LABELS: Record<DayType, string> = {
    BUSINESS: 'Hábiles',
    CONSECUTIVE: 'Corridos',
    NONE: 'Sin plazo',
};

/** Los que puede elegir el usuario: `NONE` lo pone el sistema, no se elige. */
export const SELECTABLE_DAY_TYPES = ['BUSINESS', 'CONSECUTIVE'] as const;

/**
 * El recurso tal como viene adentro de `data` en un `GET`.
 *
 * No tiene posición: los estados no tienen orden dentro del fuero y el backend
 * los lista en el orden en que se registraron (V3 D-31).
 *
 * El estado inicial "Iniciada", en el que nace toda causa, no es uno de estos:
 * es de sistema, no se lista ni se administra, y su nombre está reservado
 * (V3 D-34).
 */
export interface ProceduralState {
    id: number;
    name: string;
    jurisdiction: Jurisdiction;
    /** Días que abre el estado. `0` = no abre plazo. */
    timeLimitDays: number;
    dayType: DayType;
    /** Cierra el ciclo de vida de la causa. */
    terminal: boolean;
    /**
     * Causas activas que están hoy en este estado. Calculado; `0` en un estado
     * terminal. Viene sólo en las respuestas de `GET` (V3 D-32).
     */
    activeCases: number;
    /** La baja es lógica: un estado inactivo no se borra, se deja de ofrecer. */
    active: boolean;
}

/**
 * Lo que devuelven el `POST` y el `PATCH`: el estado sin `activeCases`, que es
 * un dato de consulta (V3 D-32). Para verlo hay que volver a pedir el listado,
 * que es lo que hacen las mutaciones al invalidarlo.
 */
export type SavedProceduralState = Omit<ProceduralState, 'activeCases'>;

export interface CreateProceduralStateBody {
    name: string;
    jurisdiction: Jurisdiction;
    timeLimitDays: number;
    dayType: DayType;
    terminal: boolean;
}

/**
 * Sin `activeCases`: las causas activas las calcula el backend.
 *
 * Tampoco lleva `jurisdiction`, aunque V3 ya lo admite en el `PATCH` si
 * ninguna causa registra el estado (D-07): el formulario todavía no ofrece el
 * selector "Fuero al que pertenece". Cuando se agregue, entra acá junto con el
 * `422 PROCEDURAL_STATE_IN_USE`.
 *
 * Tampoco lleva `active`. El contrato lo admite para reactivar una baja, pero
 * desde el cliente eliminar es eliminar: la pantalla no ofrece deshacerlo, así
 * que el tipo no deja mandarlo por error.
 */
export type UpdateProceduralStateBody = Partial<
    Pick<ProceduralState, 'name' | 'timeLimitDays' | 'dayType' | 'terminal'>
>;

/**
 * Los valores del formulario. Sólo `string` y `boolean`, que es lo que admite
 * `FormValues` de `FormModal`, y nunca `undefined`.
 *
 * `jurisdiction` no está: en el alta la fija la lengüeta activa y en la edición
 * el contrato no deja cambiarla. No es un campo, es contexto.
 */
export type ProceduralStateFormValues = {
    name: string;
    /** Entero como texto: es lo que devuelve un `input`. Se convierte al armar el cuerpo. */
    timeLimitDays: string;
    dayType: string;
    terminal: boolean;
};

export interface ProceduralStatesParams {
    page: number;
    limit: number;
    search?: string;
    /**
     * No es opcional: la pantalla muestra los estados de UN fuero. Sin filtro,
     * "Archivada" aparecería tres veces, una por cada fuero.
     */
    jurisdiction: Jurisdiction;
    /** El contrato asume `true` si no viaja. */
    active?: boolean;
}
