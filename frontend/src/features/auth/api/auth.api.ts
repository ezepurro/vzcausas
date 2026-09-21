import { http } from '@/shared/api/http'
import type { ApiItem } from '@/api-contract/envelopes'
import type { Session } from '@/features/auth/types/session'
import type { ChangePasswordBody, LoginBody } from '@/features/auth/types/credentials'

/**
 * Los tres endpoints de autenticación del contrato (§3.1). No hay más: no
 * existe `GET /users/me`, ni renovación de token, ni recuperación de
 * contraseña.
 *
 * Siempre con `http`, nunca `fetch` ni `axios` directo: es lo que garantiza
 * que un error llegue al `catch` convertido en `ApiError`.
 *
 * **Por qué este módulo no tiene `auth.keys.ts`:** `/auth` no publica ningún
 * `GET`. La sesión no es estado de servidor —no hay endpoint que la pueda
 * volver a pedir ni invalidar—, es estado de cliente: vive en el contexto y
 * en el almacenamiento del navegador. Un archivo de claves invitaría a
 * meterla en TanStack Query, donde quedaría permanentemente vencida sin forma
 * de revalidarse. Acá hay tres mutaciones y cero consultas.
 */

const BASE = '/auth'

/**
 * Inicia sesión. Devuelve la sesión pelada: el envoltorio `{ data }` del
 * contrato se saca acá y no lo ve nadie más.
 */
export async function login(body: LoginBody): Promise<Session> {
    const response = await http.post<ApiItem<Session>>(`${BASE}/login`, body)
    return response.data.data
}

/** Cierra la sesión. El servidor revoca el token; responde 204 sin cuerpo. */
export async function logout(): Promise<void> {
    await http.post(`${BASE}/logout`)
}

/**
 * Cambia la contraseña del usuario autenticado. 204 sin cuerpo, y **la
 * sesión sigue abierta**: el contrato lo dice expresamente.
 */
export async function changePassword(body: ChangePasswordBody): Promise<void> {
    await http.patch(`${BASE}/password`, body)
}
