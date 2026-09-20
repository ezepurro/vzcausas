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

/** El recurso tal como viene adentro de `data`. */
export interface ProceduralState {
    id: number;
    name: string;
    jurisdiction: Jurisdiction;
    /** Lugar dentro del ciclo de vida del fuero, desde 1. Lo renumera el backend. */
    position: number;
    /** Días que abre el estado. `0` = no abre plazo. */
    timeLimitDays: number;
    dayType: DayType;
    /** Cierra el ciclo de vida de la causa. */
    terminal: boolean;
    /** Calculado, sólo lectura. El contrato devuelve `0` hasta que exista el módulo de causas. */
    activeCases: number;
    /** La baja es lógica: un estado inactivo no se borra, se deja de ofrecer. */
    active: boolean;
}

export interface CreateProceduralStateBody {
    name: string;
    jurisdiction: Jurisdiction;
    /** Ausente = al final del ciclo. El backend corre a los que vienen después. */
    position?: number;
    timeLimitDays: number;
    dayType: DayType;
    terminal: boolean;
}

/**
 * Sin `jurisdiction` y sin `activeCases`: el contrato dice que un estado no
 * puede cambiar de fuero y que las causas activas las calcula el backend.
 *
 * Tampoco lleva `active`. El contrato lo admite para reactivar una baja, pero
 * desde el cliente eliminar es eliminar: la pantalla no ofrece deshacerlo, así
 * que el tipo no deja mandarlo por error.
 */
export type UpdateProceduralStateBody = Partial<
    Pick<ProceduralState, 'name' | 'position' | 'timeLimitDays' | 'dayType' | 'terminal'>
>;

/**
 * Dónde va el estado dentro del ciclo, tal como lo elige el usuario.
 *
 * El contrato habla de un número, pero un número no significa nada para quien
 * carga: lo que sabe es que el estado va al principio, al final, o detrás de
 * otro que puede nombrar. La traducción a `position` la hace `resolvePosition`.
 */
export const POSITION_FIRST = 'FIRST';
export const POSITION_LAST = 'LAST';
export const POSITION_AFTER_PREFIX = 'AFTER:';

/**
 * Los valores del formulario. Sólo `string` y `boolean`, que es lo que admite
 * `FormValues` de `FormModal`, y nunca `undefined`.
 *
 * `jurisdiction` no está: en el alta la fija la lengüeta activa y en la edición
 * el contrato no deja cambiarla. No es un campo, es contexto.
 */
export type ProceduralStateFormValues = {
    name: string;
    /** `'FIRST'` | `'LAST'` | `` `AFTER:${id}` `` */
    positionChoice: string;
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
     * No es opcional: la pantalla muestra el ciclo de vida de UN fuero. Sin
     * filtro, "posición 3" aparecería tres veces y no querría decir nada.
     */
    jurisdiction: Jurisdiction;
    /** El contrato asume `true` si no viaja. */
    active?: boolean;
}
