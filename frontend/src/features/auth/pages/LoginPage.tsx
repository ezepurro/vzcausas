import { useState } from 'react'
import { useLocation, useNavigate } from 'react-router'
import { isApiError } from '@/shared/api/ApiError'
import { useAuth } from '@/app/providers/AuthContext'
import { useLogin } from '@/features/auth/api/useLogin'
import { validateLogin, type LoginErrors } from '@/features/auth/schemas/login.schema'
import type { LoginFormValues } from '@/features/auth/types/credentials'
import { LoginAside } from '@/features/auth/components/LoginAside'
import { LoginForm } from '@/features/auth/components/LoginForm'

const EMPTY_FORM: LoginFormValues = { username: '', password: '' }

/** A dónde va quien entra sin haber pedido antes otra pantalla. */
const DEFAULT_DESTINATION = '/inicio'

export function LoginPage() {
    const { signIn } = useAuth()
    const navigate = useNavigate()
    const location = useLocation()

    /* Si llegó acá porque la guarda lo sacó de otra pantalla, se vuelve a
       esa. Es lo que hace que un enlace pegado en el navegador siga
       funcionando después de iniciar sesión. */
    const from = (location.state as { from?: string } | null)?.from ?? DEFAULT_DESTINATION

    const [values, setValues] = useState<LoginFormValues>(EMPTY_FORM)
    const [errors, setErrors] = useState<LoginErrors>({})
    const [banner, setBanner] = useState<string | null>(null)

    const login = useLogin()

    function changeField(field: keyof LoginFormValues, value: string) {
        setValues((current) => ({ ...current, [field]: value }))

        // Al corregir, el error deja de tener sentido: el aviso se va apenas
        // la persona empieza a escribir.
        setBanner(null)
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

        // Red, servidor caído, o cualquier otra cosa: el mensaje ya viene en
        // castellano.
        setBanner(error.message)
    }

    function submit() {
        const found = validateLogin(values)
        setErrors(found)
        if (Object.keys(found).length > 0) return

        setBanner(null)
        login.mutate(
            { username: values.username.trim(), password: values.password },
            {
                onSuccess: (session) => {
                    signIn(session)
                    // `replace`: el login no tiene que quedar en el historial.
                    navigate(from, { replace: true })
                },
                onError: handleLoginError,
            },
        )
    }

    return (
        <div className="vz-login">
            <LoginAside />
            <div className="vz-login__panel">
                <LoginForm
                    values={values}
                    errors={errors}
                    banner={banner}
                    submitting={login.isPending}
                    onChange={changeField}
                    onSubmit={submit}
                />
            </div>
        </div>
    )
}
