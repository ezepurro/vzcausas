import type { LegalQualificationListParams } from '@/features/legal-params/types/legalQualification';

/**
 * Claves de caché, en jerarquía. Nadie escribe una clave a mano fuera de este
 * archivo.
 *
 * Los parámetros del listado van ADENTRO de la clave: si no, la página 1 y la
 * página 2 escriben en la misma entrada y se pisan. `lists()` es el prefijo de
 * todos los listados: invalidarlo alcanza todas las páginas y búsquedas.
 *
 * `details()` / `detail()` quedan escritas porque es la forma que fija el
 * CLAUDE.md; hoy ninguna pantalla lee una calificación suelta.
 */
export const legalQualificationKeys = {
    all: ['legal-qualifications'] as const,
    lists: () => [...legalQualificationKeys.all, 'list'] as const,
    list: (params: LegalQualificationListParams) => [...legalQualificationKeys.lists(), params] as const,
    details: () => [...legalQualificationKeys.all, 'detail'] as const,
    detail: (id: number) => [...legalQualificationKeys.details(), id] as const,
};
