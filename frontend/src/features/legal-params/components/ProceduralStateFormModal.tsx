import { FormModal, type FieldSpec, type SelectOption } from '@/shared/components/forms';
import {
    DAY_TYPE_LABELS,
    SELECTABLE_DAY_TYPES,
    type ProceduralStateFormValues,
} from '@/features/legal-params/types/proceduralState';
import { PROCEDURAL_STATE_MAX_LENGTH, type ProceduralStateErrors } from '@/features/legal-params/schemas/proceduralState.schema';

export interface ProceduralStateFormModalProps {
    mode: 'create' | 'edit';
    sub: string;
    values: ProceduralStateFormValues;
    errors: ProceduralStateErrors;
    /** true mientras la mutación está en vuelo: bloquea el confirmar */
    saving: boolean;
    /** En la edición: hay causas activas en el estado. */
    inUse?: boolean;
    onChange: (k: string, v: string | boolean) => void;
    onConfirm: () => void;
    onCancel: () => void;
}

const DAY_TYPE_OPTIONS: SelectOption[] = SELECTABLE_DAY_TYPES.map((dayType) => ({
    value: dayType,
    label: DAY_TYPE_LABELS[dayType],
}));

/**
 * Alta y edición en el mismo modal: los campos son idénticos y sólo cambian
 * los textos. Dos componentes casi iguales se desincronizan solos.
 *
 * No valida ni guarda: recibe los errores ya calculados y avisa con
 * `onConfirm`. La decisión la toma la pantalla.
 *
 * El fuero no es un campo. En el alta lo fija la lengüeta y en la edición no
 * se puede cambiar (V3 D-36), así que va en el `sub` como contexto.
 *
 * No hay un lugar que elegir dentro del fuero: los estados no tienen orden
 * (V3 D-31).
 */
export function ProceduralStateFormModal({
    mode, sub, values, errors, saving, inUse = false, onChange, onConfirm, onCancel,
}: ProceduralStateFormModalProps) {
    const fields: FieldSpec[] = [
        {
            k: 'name',
            label: 'Nombre del estado',
            required: true,
            placeholder: 'Oposición',
            maxLength: PROCEDURAL_STATE_MAX_LENGTH.name,
            error: errors.name,
        },
        { label: 'Plazo que abre el estado', type: 'section' },
        {
            k: 'timeLimitDays',
            label: 'Días',
            width: 'half',
            required: true,
            mono: true,
            placeholder: '5',
            note: '0 si el estado no abre plazo.',
            maxLength: PROCEDURAL_STATE_MAX_LENGTH.timeLimitDays,
            error: errors.timeLimitDays,
        },
        {
            k: 'dayType',
            label: 'Se cuentan en días',
            type: 'select',
            width: 'half',
            required: true,
            options: DAY_TYPE_OPTIONS,
            // Con plazo 0 no hay días que contar: el tipo de día lo pone el
            // sistema en "sin plazo" y preguntarlo sólo permitiría equivocarse.
            when: (v) => String(v.timeLimitDays).trim() !== '0',
            error: errors.dayType,
        },
        {
            k: 'terminal',
            label: 'Este estado cierra el ciclo de vida de la causa',
            type: 'check',
        },
    ];

    return (
        <FormModal
            title={mode === 'create' ? 'Registrar estado procesal' : 'Modificar estado procesal'}
            sub={sub}
            note={
                // Cambiar el plazo no recalcula lo ya registrado (§3.4): quien
                // edita un estado en uso tiene que saberlo antes de guardar.
                mode === 'edit' && inUse
                    ? 'Hay causas en este estado. Cambiar el plazo no recalcula los vencimientos ya registrados: rige para los actos que se registren de ahora en adelante.'
                    : 'Definí el plazo para este estado. El sistema lo utilizará para calcular automáticamente la fecha de vencimiento en tu agenda de trabajo.'
            }
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
