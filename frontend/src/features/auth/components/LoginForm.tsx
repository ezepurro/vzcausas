import type { FormEvent } from 'react'
import { Button, Icon } from '@/shared/components/ui'
import { Field, TextInput } from '@/shared/components/forms'
import type { LoginFormValues } from '@/features/auth/types/credentials'
import type { LoginErrors } from '@/features/auth/schemas/login.schema'

export interface LoginFormProps {
    values: LoginFormValues
    errors: LoginErrors
    /** Error del formulario entero: credenciales, red, servidor. */
    banner: string | null
    submitting: boolean
    onChange: (field: keyof LoginFormValues, value: string) => void
    onSubmit: () => void
}

/**
 * El formulario de inicio de sesión. Presentacional: no valida ni llama al
 * servidor, sólo avisa. La pantalla decide.
 */
export function LoginForm({
    values, errors, banner, submitting, onChange, onSubmit,
}: LoginFormProps) {
    function handleSubmit(event: FormEvent<HTMLFormElement>) {
        // Es un <form> de verdad para que funcione el Enter y para que el
        // navegador ofrezca las credenciales guardadas.
        event.preventDefault()
        onSubmit()
    }

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
                <Field label="Usuario" error={errors.username} htmlFor="login-username">
                    <TextInput
                        id="login-username"
                        type="text"
                        autoComplete="username"
                        autoFocus
                        disabled={submitting}
                        value={values.username}
                        onChange={(e) => onChange('username', e.target.value)}
                    />
                </Field>

                <Field label="Contraseña" error={errors.password} htmlFor="login-password">
                    <TextInput
                        id="login-password"
                        type="password"
                        autoComplete="current-password"
                        placeholder=""
                        disabled={submitting}
                        value={values.password}
                        onChange={(e) => onChange('password', e.target.value)}
                    />
                </Field>
            </div>

            {/* No hay recuperación de contraseña: las asigna el estudio. En
                cuanto el backend publique el restablecimiento, esto pasa a
                ser el acceso a ese trámite. */}
            <p className="vz-login__hint">
                ¿Olvidaste tu contraseña? Pedile al administrador del estudio que te
                asigne una nueva.
            </p>

            <div className="vz-login__actions">
                <Button type="submit" block disabled={submitting}>
                    {submitting ? 'Ingresando…' : 'Ingresar'}
                </Button>
            </div>
        </form>
    )
}
