import type { FormEvent } from 'react'
import { Button, Icon } from '@/shared/components/ui'
import { controlA11y, Field, fieldIds, PasswordInput, TextInput } from '@/shared/components/forms'
import type { LoginFormValues } from '@/features/auth/types/credentials'
import type { LoginErrors } from '@/features/auth/schemas/login.schema'

export interface LoginFormProps {
    values: LoginFormValues
    errors: LoginErrors
    /** Error del formulario entero: credenciales, red, servidor. */
    banner: string | null
    submitting: boolean
    /**
     * Segundos que faltan para poder reintentar, tras un `429` (bloqueo de
     * login o límite de pedidos). `null` o `0`: no hay bloqueo. El `banner`
     * ya trae el motivo (`e.message`); esto sólo agrega la cuenta regresiva
     * en el botón.
     */
    lockedSecondsRemaining?: number | null
    onChange: (field: keyof LoginFormValues, value: string) => void
    onSubmit: () => void
}

/**
 * El formulario de inicio de sesión. Presentacional: no valida ni llama al
 * servidor, sólo avisa. La pantalla decide.
 */
export function LoginForm({
    values, errors, banner, submitting, lockedSecondsRemaining, onChange, onSubmit,
}: LoginFormProps) {
    function handleSubmit(event: FormEvent<HTMLFormElement>) {
        // Es un <form> de verdad para que funcione el Enter y para que el
        // navegador ofrezca las credenciales guardadas.
        event.preventDefault()
        onSubmit()
    }

    const locked = Boolean(lockedSecondsRemaining)

    return (
        <form className="vz-login__form" onSubmit={handleSubmit}>
            <h1 className="vz-login__title">Iniciar sesión</h1>
            <p className="vz-login__sub">
                Ingresá con las credenciales que te asignó el estudio.
            </p>

            {banner && (
                <div className="vz-login__alert" role="alert">
                    <Icon name="alert" size={16} className="vz-login__alert-icon" />
                    <span className="vz-login__alert-text">{banner}</span>
                </div>
            )}

            <div className="vz-login__fields">
                {/* Cada control queda unido a su error (H-58): sin esto un lector
                    de pantalla no se enteraba de que el campo estaba vacío. */}
                <Field label="Usuario" error={errors.username} htmlFor="login-username" {...fieldIds('login-username')}>
                    <TextInput
                        id="login-username"
                        {...controlA11y('login-username', errors.username)}
                        type="text"
                        autoComplete="username"
                        autoFocus
                        disabled={submitting}
                        value={values.username}
                        onChange={(e) => onChange('username', e.target.value)}
                    />
                </Field>

                <Field label="Contraseña" error={errors.password} htmlFor="login-password" {...fieldIds('login-password')}>
                    <PasswordInput
                        id="login-password"
                        {...controlA11y('login-password', errors.password)}
                        autoComplete="current-password"
                        placeholder=""
                        disabled={submitting}
                        value={values.password}
                        onChange={(e) => onChange('password', e.target.value)}
                    />
                </Field>
            </div>

            <div className="vz-login__actions">
                <Button type="submit" block disabled={submitting || locked}>
                    {submitting
                        ? 'Ingresando…'
                        : locked
                            ? `Reintentar en ${lockedSecondsRemaining} s`
                            : 'Ingresar'}
                </Button>
            </div>
        </form>
    )
}
