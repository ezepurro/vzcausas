import { FormModal, type FieldSpec, type SelectOption } from '@/shared/components/forms'
import { LAWYER_MODES, type Role, type UserFormValues } from '@/features/users/types/user'
import type { UserFormErrors } from '@/features/users/schemas/user.schema'
import { isCreatingLawyer, needsLawyer } from '@/features/users/utils/lawyerLink'

export interface UserFormModalProps {
    mode: 'create' | 'edit'
    sub: string
    values: UserFormValues
    errors: UserFormErrors
    /**
     * Las fichas disponibles para vincular, ya armadas por la pantalla: acá
     * llegan como `value` (el id) y `label` (lo que se lee).
     */
    lawyerOptions: SelectOption[]
    /** true mientras la mutación está en vuelo: bloquea el confirmar */
    saving: boolean
    onChange: (k: string, v: string | boolean) => void
    onConfirm: () => void
    onCancel: () => void
    roles:Role[]
}

/**
 * Alta y edición en el mismo modal: los campos son casi idénticos y dos
 * componentes parecidos se desincronizan solos.
 *
 * No valida ni guarda: recibe los errores ya calculados y avisa con
 * `onConfirm`. La decisión la toma la pantalla.
 */
export function UserFormModal({
    mode, sub, values, errors, lawyerOptions, saving, onChange, onConfirm, onCancel, roles
}: UserFormModalProps) {
    const creating = mode === 'create'

    /** Con perfil Secretaría no hay ficha, así que la sección entera no va. */
    const withLawyer = () => needsLawyer(roles)

    /** El alta de una ficha nueva sólo se ofrece al registrar un usuario. */
    const creatingLawyer = (v: Record<string, string | boolean>) =>
        withLawyer() && creating && isCreatingLawyer(String(v.lawyerMode ?? ''))

    const fields: FieldSpec[] = [
        {
            k: 'fullName',
            label: 'Nombre y apellido',
            width: 'half',
            required: true,
            error: errors.fullName,
        },
        {
            k: 'username',
            label: 'Nombre de usuario',
            width: 'half',
            required: true,
            mono: true,
            placeholder: 'napellido',
            error: errors.username,
        },
        {
            k: 'email',
            label: 'Correo electrónico',
            width: 'half',
            required: true,
            placeholder: 'napellido@vazquezzarate.com',
            error: errors.email,
        },
        /* La contraseña sólo en el alta: cambiarla es `PATCH /auth/password`,
           y eso lo hace cada uno con la suya. */
        ...(creating
            ? [
                    {
                        k: 'password',
                        label: 'Contraseña inicial',
                        type: 'pass' as const,
                        width: 'half' as const,
                        required: true,
                        note: 'Mínimo 8 caracteres, con al menos un número.',
                        error: errors.password,
                    },
                    {
                        k: 'passwordConfirm',
                        label: 'Repetir contraseña',
                        type: 'pass' as const,
                        width: 'half' as const,
                        required: true,
                        error: errors.passwordConfirm,
                    },
                ]
            : []),
        /* Un tilde por perfil y no un select: el contrato guarda un arreglo y
            en el estudio hay gente que es administrador y abogado a la vez.
           Con un select, editarlos les borraba el segundo perfil. */
        { label: 'Perfiles', type: 'section' },
        {
            k: 'roleAdministrator',
            label: 'Administrador — Encargado de la administración del sistema',
            type: 'check',
            error: errors.roleAdministrator,
        },
        {
            k: 'roleLawyer',
            label: 'Abogado — Lleva causas a su nombre',
            type: 'check',
            error: errors.roleLawyer,
        },
        {
            k: 'roleSecretary',
            label: 'Secretaría — carga y seguimiento, sin ficha profesional',
            type: 'check',
            error: errors.roleSecretary,
        },
        { label: 'Ficha profesional', type: 'section', when: withLawyer },
        ...(creating
            ? [
                {
                    k: 'lawyerMode',
                    label: 'Ficha de abogado',
                    type: 'select' as const,
                    options: [LAWYER_MODES.link, LAWYER_MODES.create],
                    when: withLawyer,
                },
                ]
            : []),
        {
            k: 'lawyerId',
            label: 'Abogado',
            type: 'select',
            required: true,
            /* La opción vacía primero, y no las fichas peladas. Sin ella, el
               valor inicial `''` no coincide con ninguna opción y el navegador
               selecciona la primera: en pantalla se ve un abogado elegido
               mientras el valor real sigue vacío, y al confirmar salta "este
               perfil necesita una ficha vinculada" sin que se entienda por
               qué. Mismo patrón que `ROLE_FILTER` en `UsersPage`. */
            options: [{ value: '', label: 'Seleccioná un abogado' }, ...lawyerOptions],
            error: errors.lawyerId,
            when: (v) => withLawyer() && !creatingLawyer(v),
        },
        {
            k: 'lawyerFullName',
            label: 'Nombre y apellido del abogado',
            width: 'half',
            required: true,
            placeholder: 'Dr. / Dra. Nombre Apellido',
            error: errors.lawyerFullName,
            when: creatingLawyer,
        },
        {
            k: 'registrationNumber',
            label: 'Matrícula',
            width: 'half',
            required: true,
            mono: true,
            placeholder: '1-00000',
            error: errors.registrationNumber,
            when: creatingLawyer,
        },
    ]

    return (
        <FormModal
            title={creating ? 'Registrar usuario' : 'Modificar usuario'}
            sub={sub}
            fields={fields}
            values={values}
            onChange={onChange}
            okLabel={creating ? 'Registrar usuario' : 'Guardar cambios'}
            okDisabled={saving}
            onConfirm={onConfirm}
            onCancel={onCancel}
        />
    )
}
