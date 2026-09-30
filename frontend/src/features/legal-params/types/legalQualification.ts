/**
 * Las formas de la calificación legal, sacadas del contrato (V3 §3.5).
 *
 * La calificación es el encuadre jurídico del hecho y define el plazo de
 * prescripción de la acción. Es parametría, igual que los estados procesales,
 * y por eso vive en este módulo (EP-03).
 */

import type { PaginatedQuery } from '@/api-contract/envelopes';

/** El recurso tal como viene adentro de `data`. */
export interface LegalQualification {
    id: number;
    /** Denominación con la norma, en un solo campo: `Hurto simple — art. 162 CP`. */
    name: string;
    /** Plazo de prescripción en meses enteros. El "6 años y 6 meses" lo arma el front. */
    prescriptionMonths: number;
    /** Causas activas que la registran. Calculado, sólo lectura. */
    activeCases: number;
    /** Vale siempre `true`: una calificación dada de baja deja de listarse. */
    active: boolean;
}

export interface CreateLegalQualificationBody {
    name: string;
    prescriptionMonths: number;
}

/** Cuerpo del `PATCH`: todo opcional, al menos un campo. */
export type UpdateLegalQualificationBody = Partial<CreateLegalQualificationBody>;

/**
 * Los valores del formulario. El prototipo pide el plazo como años enteros más
 * un select de meses (0 a 11), para admitir "6 años y medio"; el contrato
 * recibe el total en meses. La conversión la hace `utils/prescription`.
 */
export type LegalQualificationFormValues = {
    name: string;
    /** Entero como texto: es lo que devuelve un `input`. */
    years: string;
    /** `'0'` a `'11'`: sale de un select. */
    months: string;
};

export interface LegalQualificationListParams extends PaginatedQuery {
    /** Filtra por `name`, que incluye el artículo. */
    search?: string;
}
