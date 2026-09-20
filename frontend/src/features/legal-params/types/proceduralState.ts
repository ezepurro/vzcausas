/**
 * Estado procesal: el registro que gobierna el cómputo de plazos del sistema
 * (RN4). Cada estado pertenece a un fuero y define cuántos días corren y si
 * se cuentan hábiles o corridos.
 *
 * Escrito a partir del contrato (§2.4), no copiado de `shared/mocks`: los
 * mocks son sólo para desarrollo.
 */

/**
 * Fueros con los que trabaja el estudio.
 *
 * El contrato sólo nombra `ADMINISTRATIVE` y `CRIMINAL` en sus ejemplos.
 * `AMPARO` es el tercero y está pendiente de confirmación con el backend
 * (ver `shared/mocks/README.md`).
 *
 * Va como arreglo tipado y como unión de literales: así el arreglo deja de
 * compilar si alguien cambia la unión y se olvida del arreglo.
 */

export const JURISDICTIONS = [
    'ADMINISTRATIVE',
    'CRIMINAL',
    'AMPARO',

] as const;

export type Jurisdiction = (typeof JURISDICTIONS)[number];

/** Cómo se cuentan los días del plazo: hábiles o corridos. */
export const DAY_TYPES = ['BUSINESS', 'CONSECUTIVE'] as const;

export type DayType = (typeof DAY_TYPES)[number];

/** El recurso tal como viene adentro de `data`. */
export interface ProceduralState {
    id: number;
    name: string;
    jurisdiction: Jurisdiction;
    /**
     * Cantidad de días del plazo. Es un **string** (`"10"`), no un número: así
     * lo define el contrato. No lo conviertas en la capa `api/`; si hace falta
     * como número, se convierte donde se calcule.
     */
    proceduralTimeLimit: string;
    dayType: DayType;
}

/** Cuerpo del `POST`: sin `id`, que lo genera el backend. */
export interface CreateProceduralStateBody {
    name: string;
    jurisdiction: Jurisdiction;
    proceduralTimeLimit: string;
    dayType: DayType;
}

/**
 * Cuerpo del `PATCH`: todo opcional, pero hay que mandar al menos un campo.
 * Un PATCH vacío responde 400 — de eso se ocupa `buildProceduralStatePatch`.
 */
export type UpdateProceduralStateBody = Partial<CreateProceduralStateBody>;

/**
 * Los valores del formulario.
 *
 * Sólo `string`, que es lo que admite `FormValues` de `FormModal`. Nunca
 * `undefined`: un campo vacío es `''`, no ausencia. Por eso `jurisdiction` y
 * `dayType` son `string` pelado y no su unión: mientras están en el
 * formulario pueden tener cualquier cosa, y recién `schemas/` decide si sirven.
 *
 * Declarado con `type` y NO con `interface` a propósito: ver la nota abajo.
 */
export type ProceduralStateFormValues = {
    name: string;
    jurisdiction: string;
    proceduralTimeLimit: string;
    dayType: string;
};

/** Parámetros del listado: paginación y filtros (§2.4). */
export interface ProceduralStatesParams {
    page: number;
    limit: number;
    search?: string;
    jurisdiction?: Jurisdiction;
}
