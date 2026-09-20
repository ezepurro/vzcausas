/**
 * La forma de lo que viaja entre el front y el back.
 *
 * El contrato (§4.1) envuelve todas las respuestas exitosas: un recurso viene
 * en `data`, una colección viene en `data` + `pagination`. Estos tipos viven
 * acá y no adentro de un módulo porque son los mismos para todos: si cada
 * feature declara su propio `Pagination`, el día que el backend le agregue un
 * campo hay que tocarlo en diez lugares.
 *
 * Los módulos no los propagan hacia afuera: su capa `api/` saca el envoltorio
 * y entrega los datos pelados.
 */

/** Metadatos de paginación de una colección (§4.1). */
export interface Pagination {
    page: number;
    limit: number;
    totalItems: number;
    totalPages: number;
}

/** Respuesta de un recurso individual: `POST`, `PATCH`, `GET /recurso/{id}`. */
export interface ApiItem<T> {
    data: T;
}

/** Respuesta de una colección paginada. */
export interface ApiList<T> {
    data: T[];
    pagination: Pagination;
}
/**
 * Parámetros de paginación de cualquier colección (§4.1). Opcionales porque
 * el backend tiene default: `page` 1, `limit` 20.
 */
export interface PaginatedQuery {
    page?: number;
    limit?: number;
}