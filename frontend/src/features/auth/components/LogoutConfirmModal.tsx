import { isApiError } from '@/shared/api/ApiError'
import { useToast } from '@/app/providers/ToastContext'
import { useAuth, useCurrentUser } from '@/app/providers/AuthContext'
import { FormModal } from '@/shared/components/forms'
import { useLogout } from '@/features/auth/api/useLogout'

export interface LogoutConfirmModalProps {
    /** Se llama al cancelar. Al confirmar no hace falta: la sesión se cierra y la pantalla cambia sola. */
    onClose: () => void
}

/**
 * Confirmación antes de cerrar sesión. Es un `FormModal` sin campos.
 *
 * Igual que `ChangePasswordModal`, se ocupa de su propia llamada al servidor
 * en vez de recibirla de afuera: el marco de la aplicación sólo decide si el
 * modal está abierto.
 */
export function LogoutConfirmModal({ onClose }: LogoutConfirmModalProps) {
    const toast = useToast()
    const user = useCurrentUser()
    const { signOut } = useAuth()
    const logout = useLogout()

    /**
     * La sesión local se cierra pase lo que pase: la persona pidió salir y
     * dejarla adentro por un error de red sería peor. La redirección al login
     * la hace sola la guarda, apenas la sesión queda en nulo.
     *
     * El motivo `'user'` importa: le dice a la guarda que **no** anote esta
     * pantalla, así el próximo que inicie sesión arranca en Inicio y no acá.
     */
    function confirm() {
        if (logout.isPending) return

        logout.mutate(undefined, {
            onSettled: () => signOut('user'),
            onError: (error) => {
                /* Un 401 quiere decir que el token ya estaba muerto: no hay
                   nada que avisar. Un error de red o del servidor sí importa,
                   porque la sesión puede haber quedado abierta del otro lado. */
                if (isApiError(error) && !error.isAuth) {
                    toast('error', error.message)
                }
            },
        })
    }

    return (
        <FormModal
            title="Cerrar sesión"
            sub={`${user.fullName} · ${user.username}`}
            width="sm"
            note="¿Seguro que deseas cerrar la sesión?"
            values={{}}
            onChange={() => {}}
            okLabel="Cerrar sesión"
            okDisabled={logout.isPending}
            onConfirm={confirm}
            onCancel={onClose}
        />
    )
}
