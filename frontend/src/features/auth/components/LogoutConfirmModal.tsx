import { isApiError } from '@/shared/api/ApiError'
import { useToast } from '@/app/providers/ToastContext'
import { useAuth, useCurrentUser } from '@/app/providers/AuthContext'
import { useSessionTransition } from '@/app/providers/SessionTransitionContext'
import { useBackgroundTasks } from '@/app/providers/BackgroundTasksContext'
import { FormModal } from '@/shared/components/forms'
import { formatPersonFullName } from '@/shared/lib/personName'
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
    const playTransition = useSessionTransition()
    const logout = useLogout()
    const running = useBackgroundTasks().tasks.filter((task) => task.status === 'running').length

    /**
     * La sesión local se cierra pase lo que pase: la persona pidió salir y
     * dejarla adentro por un error de red sería peor. La redirección al login
     * la hace sola la guarda, apenas la sesión queda en nulo.
     *
     * El cierre va dentro del telón de despedida (`useSessionTransition`): la
     * pantalla se tapa con el monograma dando una vuelta mientras sale el
     * pedido, la sesión se cierra con la pantalla tapada —así no se ve la app
     * vaciarse— y se destapa ya en el login.
     *
     * El motivo `'user'` importa: le dice a la guarda que **no** anote esta
     * pantalla, así el próximo que inicie sesión arranca en Inicio y no acá.
     */
    function confirm() {
        if (logout.isPending) return

        const request = logout.mutateAsync().catch((error: unknown) => {
            /* Un 401 quiere decir que el token ya estaba muerto: no hay
               nada que avisar. Un error de red o del servidor sí importa,
               porque la sesión puede haber quedado abierta del otro lado. */
            if (isApiError(error) && !error.isAuth) {
                toast('error', error.message)
            }
        })

        void playTransition({
            variant: 'leave',
            title: `Hasta pronto, ${user.firstName}`,
            detail: 'Cerrando sesión…',
            waitFor: request,
            swap: () => signOut('user'),
        })
    }

    return (
        <FormModal
            title="Cerrar sesión"
            sub={`${formatPersonFullName(user)} · ${user.username}`}
            width="sm"
            note={`¿Seguro que deseas cerrar la sesión?${runningTasksNotice(running)}`}
            values={{}}
            onChange={() => {}}
            okLabel="Cerrar sesión"
            okDisabled={logout.isPending}
            onConfirm={confirm}
            onCancel={onClose}
        />
    )
}

/**
 * Con tareas en segundo plano en curso: el servidor las termina igual, pero al
 * salir se borran sus tarjetas (`AuthProvider`), así que no se ve cómo
 * terminan. Se dice antes de confirmar.
 */
function runningTasksNotice(count: number): string {
    if (count === 0) return ''
    /* Para abogados: lo que se está preparando y dónde encontrarlo, no "tareas". */
    return count === 1
        ? ' Hay un expediente o una carpeta de Drive preparándose. Se va a terminar igual, pero no vas a ver el aviso: lo vas a encontrar en la causa.'
        : ` Hay ${count} expedientes o carpetas de Drive preparándose. Se van a terminar igual, pero no vas a ver el aviso: los vas a encontrar en sus causas.`
}
