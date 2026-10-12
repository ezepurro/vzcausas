import { useRef, useState } from 'react'
import { isApiError } from '@/shared/api/ApiError'
import { useFocusFirstError } from '@/shared/hooks/useFocusFirstError'
import { useAuth } from '@/app/providers/AuthContext'
import { useCountdown } from '@/shared/hooks/useCountdown'
import { useLogin } from '@/features/auth/api/useLogin'
import { validateLogin, type LoginErrors } from '@/features/auth/schemas/login.schema'
import type { LoginFormValues } from '@/features/auth/types/credentials'
import { LoginAside } from '@/features/auth/components/LoginAside'
import { LoginForm } from '@/features/auth/components/LoginForm'

const EMPTY_FORM: LoginFormValues = { username: '', password: '' }

/**
 * La pantalla de inicio de sesión.
 *
 * **No navega.** Abre la sesión y nada más: a dónde va quien acaba de entrar
 * lo decide `RedirectIfSession`, la guarda que tiene esta pantalla encima, que
 * es la que sabe de dónde venía. Antes acá había un `navigate(from)` que
 * competía con esa guarda y perdía —ver el comentario de
 * `app/router/RedirectIfSession.tsx`—, así que la persona terminaba en Inicio
 * y no en la pantalla que había pedido.
 */
export function LoginPage() {
    const { signIn } = useAuth()

    const [values, setValues] = useState<LoginFormValues>(EMPTY_FORM)
    const [errors, setErrors] = useState<LoginErrors>({})
    const [banner, setBanner] = useState<string | null>(null)
    const [retryAfterSeconds, setRetryAfterSeconds] = useState<number | null>(null)
    const lockedSecondsRemaining = useCountdown(retryAfterSeconds)

    /*
     * Cuando la cuenta pasa de "en curso" a "terminada", el aviso de bloqueo
     * queda obsoleto —ya se puede reintentar— y seguir mostrando "esperá"
     * sería engañoso. Derivado durante el render, no en un efecto: mismo
     * motivo que en `useCountdown` (ver su comentario) y lo que evita volver
     * a toparse con esa misma carrera acá — el aviso llegó a desaparecer
     * antes de que el usuario llegara a verlo, en un render intermedio
     * donde el efecto corría con el dato de la vuelta anterior.
     */
    const [wasLocked, setWasLocked] = useState(lockedSecondsRemaining !== null)
    const isLocked = lockedSecondsRemaining !== null
    if (isLocked !== wasLocked) {
        setWasLocked(isLocked)
        if (wasLocked && !isLocked) {
            setBanner(null)
            setRetryAfterSeconds(null)
        }
    }

    const panelRef = useRef<HTMLDivElement>(null)
    // En el celular el panel puede quedar corrido: al confirmar, al primer error.
    const focusErrors = useFocusFirstError(panelRef, errors)

    const login = useLogin()

    function changeField(field: keyof LoginFormValues, value: string) {
        setValues((current) => ({ ...current, [field]: value }))

        // Al corregir, el error deja de tener sentido: el aviso se va apenas
        // la persona empieza a escribir. Excepto durante un bloqueo: ese
        // aviso sigue siendo cierto se escriba lo que se escriba, y es la
        // única explicación de por qué el botón está deshabilitado con una
        // cuenta regresiva. Se levanta solo, cuando la cuenta llega a cero.
        if (lockedSecondsRemaining === null) {
            setBanner(null)
        }
        setErrors((current) => (current[field] ? { ...current, [field]: undefined } : current))
    }

    /**
     * Los errores del servidor llegan siempre como `ApiError`. Se ramifica
     * por código y por los getters, nunca comparando el texto del mensaje.
     */
    function handleLoginError(error: unknown) {
        if (!isApiError(error)) throw error

        /* Credenciales inválidas: va al aviso de arriba y no a un campo. El
           servidor no dice cuál de los dos está mal —y hace bien: marcar
           "usuario" delataría qué usuarios existen—. Se borra la contraseña,
           que es lo que hay que volver a escribir. */
        if (error.is('INVALID_CREDENTIALS')) {
            setValues((current) => ({ ...current, password: '' }))
            setBanner(error.message)
            return
        }

        if (error.isValidation && error.hasFieldErrors) {
            setErrors({
                username: error.fieldError('username'),
                password: error.fieldError('password'),
            })
            return
        }

        /* 429: bloqueo de login o límite de pedidos (V3 §4). El mensaje ya
           explica el motivo; acá sólo arranca la cuenta regresiva del botón.
           `retryAfterSeconds` puede venir `null` si el backend no mandó el
           encabezado `Retry-After` —queda el aviso, sin cuenta regresiva. */
        if (error.is('TOO_MANY_LOGIN_ATTEMPTS') || error.is('TOO_MANY_REQUESTS')) {
            setBanner(error.message)
            setRetryAfterSeconds(error.retryAfterSeconds)
            return
        }

        // Red, servidor caído, o cualquier otra cosa: el mensaje ya viene en
        // castellano.
        setBanner(error.message)
    }

    function submit() {
        // El botón ya queda deshabilitado durante el bloqueo, pero eso no
        // alcanza: con un <form> real, Enter en un campo de texto dispara el
        // submit igual aunque el botón esté disabled. Esta es la guarda que
        // realmente impide el pedido, no sólo la visual.
        if (lockedSecondsRemaining !== null) return

        focusErrors()
        const found = validateLogin(values)
        setErrors(found)
        if (Object.keys(found).length > 0) return

        setBanner(null)
        login.mutate(
            { username: values.username.trim(), password: values.password },
            {
                /* Sólo abrir la sesión: `RedirectIfSession` se encarga del
                   resto, y con `replace` para que el login no quede en el
                   historial. */
                onSuccess: signIn,
                onError: handleLoginError,
            },
        )
    }

    return (
        <div className="vz-login">
            <LoginAside />
            <div className="vz-login__panel" ref={panelRef}>
                <LoginForm
                    values={values}
                    errors={errors}
                    banner={banner}
                    submitting={login.isPending}
                    lockedSecondsRemaining={lockedSecondsRemaining}
                    onChange={changeField}
                    onSubmit={submit}
                />
            </div>
        </div>
    )
}
