/**
 * Validación del formulario de calificación legal.
 * El backend las vuelve a verificar: validar acá es para no gastar un viaje al
 * servidor y para decir qué campo está mal, no para reemplazarlo.
 *
 * Los límites son los del cuerpo de `POST /legal-qualifications` (V3 §3.5).
 */

import type { LegalQualificationFormValues } from '@/features/legal-params/types/legalQualification';
import { toPrescriptionMonths } from '@/features/legal-params/utils/prescription';

export type LegalQualificationErrors = Partial<Record<keyof LegalQualificationFormValues, string>>;

const NAME_MAX = 255;

/** El alta y la modificación validan lo mismo: son los dos únicos campos. */
export function validateLegalQualification(
    values: LegalQualificationFormValues,
): LegalQualificationErrors {
    const errors: LegalQualificationErrors = {};

    const name = values.name.trim();
    if (!name) {
        errors.name = 'El nombre de la calificación es obligatorio.';
    } else if (name.length > NAME_MAX) {
        errors.name = `Puede tener hasta ${NAME_MAX} caracteres.`;
    }

    const years = values.years.trim();
    if (!years) {
        errors.years = 'Los años son obligatorios. Si el plazo es menor a un año, poné 0.';
    } else if (!/^\d+$/.test(years)) {
        // El mismo mensaje del prototipo: el medio año va en el select de meses.
        errors.years = 'Los años deben ser un número entero. Para medio año usá el campo Meses.';
    } else if ((toPrescriptionMonths(values.years, values.months) ?? 0) < 1) {
        // El contrato pide al menos un mes; el error va en los años porque
        // "0 años y 0 meses" se corrige ahí.
        errors.years = 'El plazo tiene que ser de al menos un mes.';
    }

    return errors;
}

/** `true` si no hay ningún error. Evita repetir el `Object.keys` en la pantalla. */
export function isValid(errors: LegalQualificationErrors): boolean {
    return Object.keys(errors).length === 0;
}
