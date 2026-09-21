import { useState } from 'react'
import { isApiError } from '@/shared/api/ApiError'
import { useToast } from '@/app/providers/ToastContext'
import { useCurrentUser } from '@/app/providers/AuthContext'
import { FormModal, type FieldSpec } from '@/shared/components/forms'
import { useChangePassword } from '@/features/auth/api/useChangePassword'
import {
    validateChangePassword,
    type ChangePasswordErrors,
} from '@/features/auth/schemas/changePassword.schema'
import type { ChangePasswordFormValues } from '@/features/auth/types/credentials'

export interface ChangePasswordModalProps {
    /** Se llama tanto al cancelar como al terminar bien. */
    onClose: () => void
}

const EMPTY_FORM: ChangePasswordFormValues = {
    currentPassword: '',
    newPassword: '',
    repeatPassword: '',
}

/**
 * Cambio de la propia contraseña.
 *
 * A diferencia del resto de los modales del sistema, este se ocupa de su
 * propio estado y de su propia llamada al servidor en vez de recibirlo todo
 * de la pantalla. Es a propósito: quien lo abre es el marco de la aplicación,
 * que está en `app/` y no tiene por qué cargar con la lógica de una historia
 * de autenticación. Así el marco sólo decide si el modal está abierto.
 */
export function ChangePasswordModal({ onClose }: ChangePasswordModalProps) {
    const toast = useToast()
    const user = useCurrentUser()

    const [values, setValues] = useState<ChangePasswordFormValues>(EMPTY_FORM)
    const [errors, setErrors] = useState<ChangePasswordErrors>({})

    const change = useChangePassword()

    function changeField(key: string, value: string | boolean) {
        const field = key as keyof ChangePasswordFormValues
        setValues((current) => ({ ...current, [field]: String(value) }))
        setErrors((current) => (current[field] ? { ...current, [field]: undefined } : current))
    }

    /**
     * Los errores llegan siempre como `ApiError`. Se ramifica por código y
     * por los getters, nunca comparando el texto del mensaje.
     */
    function handleApiError(error: unknown) {
        if (!isApiError(error)) throw error

        /* Es un 422 y no un 400, pero el problema es de un campo concreto: va
           marcado en la contraseña actual y no en un aviso suelto. */
        if (error.is('INVALID_CURRENT_PASSWORD')) {
            setErrors({ currentPassword: error.message })
            return
        }

        if (error.isValidation && error.hasFieldErrors) {
            setErrors({
                currentPassword: error.fieldError('currentPassword'),
                newPassword: error.fieldError('newPassword'),
            })
            return
        }

        /* Sesión vencida: no hay campo que marcar y la pantalla está por
           cambiar sola, porque el cierre de sesión ya se disparó. */
        if (error.isAuth) {
            toast('error', error.message)
            onClose()
            return
        }

        /* Red o servidor: el modal queda abierto con lo que la persona
           escribió, para que pueda reintentar sin volver a tipear todo. */
        toast('error', error.message)
    }

    function submit() {
        const found = validateChangePassword(values)
        setErrors(found)
        if (Object.keys(found).length > 0) return

        change.mutate(
            {
                currentPassword: values.currentPassword,
                newPassword: values.newPassword,
            },
            {
                onSuccess: () => {
                    // No es un dato de color: el contrato dice que la sesión
                    // no se cierra, y conviene que la persona lo sepa.
                    toast('success', 'Contraseña actualizada. La sesión sigue abierta.')
                    onClose()
                },
                onError: handleApiError,
            },
        )
    }

    const fields: FieldSpec[] = [
        {
            k: 'currentPassword',
            label: 'Contraseña actual',
            type: 'pass',
            required: true,
            error: errors.currentPassword,
        },
        {
            k: 'newPassword',
            label: 'Contraseña nueva',
            type: 'pass',
            required: true,
            error: errors.newPassword,
        },
        {
            k: 'repeatPassword',
            label: 'Repetir la nueva',
            type: 'pass',
            required: true,
            error: errors.repeatPassword,
        },
    ]

    return (
        <FormModal
            title="Cambiar contraseña"
            sub={`${user.fullName} · ${user.username}`}
            note="Mínimo 8 caracteres, con al menos un número"
            width="sm"
            fields={fields}
            values={values}
            onChange={changeField}
            okLabel="Cambiar contraseña"
            okDisabled={change.isPending}
            onConfirm={submit}
            onCancel={onClose}
        />
    )
}
