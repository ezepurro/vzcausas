import { FormModal, type FieldSpec } from '@/shared/components/forms';
import {
    DAY_TYPES,
    JURISDICTIONS,
    type ProceduralStateFormValues,
} from '@/features/legal-params/types/proceduralState';
import type { ProceduralStateErrors } from '@/features/legal-params/schemas/proceduralState.schema';

export interface ProceduralStateFormModalProps {
    mode: 'create' | 'edit';
    sub: string;
    values: ProceduralStateFormValues;
    errors: ProceduralStateErrors;
    /** true mientras la mutación está en vuelo: bloquea el confirmar */
    saving: boolean;
    onChange: (k: string, v: string | boolean) => void;
    onConfirm: () => void;
    onCancel: () => void;
}

/**
 * Alta y edición en el mismo modal: los campos son idénticos y sólo cambian
 * los textos. Dos componentes casi iguales se desincronizan solos.
 *
 * No valida ni guarda: recibe los errores ya calculados y avisa con
 * `onConfirm`. La decisión la toma la pantalla.
 */
export function ProceduralStateFormModal({
    mode, sub, values, errors, saving, onChange, onConfirm, onCancel,
}: ProceduralStateFormModalProps) {
    const fields: FieldSpec[] = [
        {
            k: 'name',
            label: 'Nombre del estado',
            required: true,
            placeholder: 'Como lo nombra el estudio en el expediente',
            note: 'Puede repetirse entre fueros: cada fuero tiene su propio ciclo.',
            error: errors.name,
        },
        {
            k: 'jurisdiction',
            label: 'Fuero',
            type: 'select',
            required: true,
            options: [...JURISDICTIONS],
            error: errors.jurisdiction,
        },
        { label: 'Plazo que abre el estado', type: 'section' },
        {
            k: 'proceduralTimeLimit',
            label: 'Días',
            width: 'half',
            required: true,
            mono: true,
            placeholder: '5',
            error: errors.proceduralTimeLimit,
        },
        {
            k: 'dayType',
            label: 'Se cuentan en días',
            type: 'select',
            width: 'half',
            required: true,
            options: [...DAY_TYPES],
            error: errors.dayType,
        },
    ];

    return (
        <FormModal
            title={mode === 'create' ? 'Registrar estado procesal' : 'Modificar estado procesal'}
            sub={sub}
            note="Definí el plazo para este estado. El sistema lo utilizará para calcular automáticamente la fecha de vencimiento en tu agenda de trabajo."
            fields={fields}
            values={values}
            onChange={onChange}
            okLabel={mode === 'create' ? 'Registrar estado' : 'Guardar cambios'}
            okDisabled={saving}
            onConfirm={onConfirm}
            onCancel={onCancel}
        />
    );
}
