import type { ProceduralStatesParams } from '@/features/legal-params/types/proceduralState';

/**
 * Claves de caché, en jerarquía. Nadie escribe una clave a mano fuera de este
 * archivo.
 *
 * Los parámetros del listado van ADENTRO de la clave: si no, la página 1 y la
 * página 2 escriben en la misma entrada y se pisan.
 *
 * `lists()` es el prefijo de todos los listados. Invalidarlo alcanza todas las
 * páginas y todos los filtros de una sola vez, que es justo lo que hace falta
 * después de un alta o una baja.
 *
 * `details()` / `detail()` quedan reservadas: el contrato define
 * `GET /procedural-states/{id}`, pero hoy ninguna pantalla lo usa, así que
 * nadie las llena. Se dejan escritas porque es la forma que fija el CLAUDE.md
 * y porque la baja ya limpia esa entrada.
 */
export const proceduralStateKeys = {
    all: ['procedural-states'] as const,
    lists: () => [...proceduralStateKeys.all, 'list'] as const,
    list: (params: ProceduralStatesParams) => [...proceduralStateKeys.lists(), params] as const,
    details: () => [...proceduralStateKeys.all, 'detail'] as const,
    detail: (id: number) => [...proceduralStateKeys.details(), id] as const,
};
