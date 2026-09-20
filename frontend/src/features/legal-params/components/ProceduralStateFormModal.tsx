import { FormModal, type FieldSpec, type SelectOption } from '@/shared/components/forms';
import {
    DAY_TYPE_LABELS,
    SELECTABLE_DAY_TYPES,
    type ProceduralStateFormValues,
} from '@/features/legal-params/types/proceduralState';
import type { ProceduralStateErrors } from '@/features/legal-params/schemas/proceduralState.schema';

export interface ProceduralStateFormModalProps {
    mode: 'create' | 'edit';
    sub: string;
    values: ProceduralStateFormValues;
    errors: ProceduralStateErrors;
    /** Opciones del ciclo del fuero; las arma la pantalla, que es la que tiene los datos. */
    positionOptions: SelectOption[];
    /** true mientras la mutación está en vuelo: bloquea el confirmar */
    saving: boolean;
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
 * El fuero no es un campo. En el alta lo fija la lengüeta y en la edición el
 * contrato no deja cambiarlo, así que va en el `sub` como contexto.
 */
export function ProceduralStateFormModal({
    mode, sub, values, errors, positionOptions, saving, onChange, onConfirm, onCancel,
}: ProceduralStateFormModalProps) {
    const fields: FieldSpec[] = [
        {
            k: 'name',
            label: 'Nombre del estado',
            required: true,
            placeholder: 'Oposición',
            error: errors.name,
        },
        { label: 'Lugar en el ciclo de vida', type: 'section' },
        {
            k: 'positionChoice',
            label: '¿Dónde va este estado?',
            type: 'select',
            required: true,
            options: positionOptions,
            error: errors.positionChoice,
        },
        {
            k: 'terminal',
            label: 'Este estado cierra el ciclo de vida de la causa',
            type: 'check',
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
