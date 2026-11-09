import { FormModal, type FieldSpec } from '@/shared/components/forms';
import type { LegalQualificationFormValues } from '@/features/legal-params/types/legalQualification';
import { LEGAL_QUALIFICATION_MAX_LENGTH, type LegalQualificationErrors } from '@/features/legal-params/schemas/legalQualification.schema';
import { MONTH_OPTIONS } from '@/features/legal-params/utils/prescription';

export interface LegalQualificationFormModalProps {
    mode: 'create' | 'edit';
    values: LegalQualificationFormValues;
    errors: LegalQualificationErrors;
    /**
     * `true` si se abre desde "Registrar calificación nueva" del alta de causa:
     * el texto avisa que queda agregada a la causa al confirmar.
     */
    fromCase?: boolean;
    /** Causas activas que la usan, en la edición: cambian su prescripción. */
    activeCases?: number;
    /** true mientras la mutación está en vuelo: bloquea el confirmar */
    saving: boolean;
    onChange: (k: string, v: string | boolean) => void;
    onConfirm: () => void;
    onCancel: () => void;
}

/**
 * Alta y modificación de una calificación legal en el mismo modal: los campos
 * son idénticos y sólo cambian los textos.
 *
 * No valida ni guarda: recibe los errores ya calculados y avisa con
 * `onConfirm`.
 *
 * En la edición avisa lo que el contrato hace a propósito (V3 D-08): cambiar
 * el plazo **recalcula la prescripción** de las causas que la usan, al revés
 * que el plazo de un estado procesal.
 */
export function LegalQualificationFormModal({
    mode, values, errors, fromCase = false, activeCases = 0, saving, onChange, onConfirm, onCancel,
}: LegalQualificationFormModalProps) {
    const creating = mode === 'create';

    const fields: FieldSpec[] = [
        {
            k: 'name',
            label: 'Nombre de la calificación legal',
            required: true,
            placeholder: 'Ej. Hurto simple — art. 162 CP',
            note: 'Con el artículo después de la raya: la carátula sugerida usa sólo la parte de adelante.',
            maxLength: LEGAL_QUALIFICATION_MAX_LENGTH.name,
            error: errors.name,
        },
        { label: 'Plazo de prescripción de la acción', type: 'section' },
        {
            k: 'years',
            label: 'Años',
            width: 'half',
            required: true,
            mono: true,
            placeholder: '6',
            maxLength: LEGAL_QUALIFICATION_MAX_LENGTH.years,
            error: errors.years,
        },
        {
            k: 'months',
            label: 'Meses',
            type: 'select',
            width: 'half',
            options: MONTH_OPTIONS,
            note: '6 años y medio = 6 años y 6 meses.',
            error: errors.months,
        },
    ];

    return (
        <FormModal
            title={creating ? 'Registrar calificación legal' : 'Modificar calificación legal'}
            sub={
                !creating
                    ? values.name
                    : fromCase
                        ? 'Al confirmar, queda agregada a la causa.'
                        : 'Queda disponible para seleccionar al registrar causas.'
            }
            note={
                !creating && activeCases > 0
                    ? `La usan ${activeCases === 1 ? '1 causa activa' : `${activeCases} causas activas`}. Cambiar el plazo recalcula su prescripción.`
                    : undefined
            }
            fields={fields}
            values={values}
            onChange={onChange}
            okLabel={creating ? 'Registrar calificación' : 'Guardar cambios'}
            okDisabled={saving}
            onConfirm={onConfirm}
            onCancel={onCancel}
        />
    );
}
