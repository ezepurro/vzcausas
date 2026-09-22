import { http } from '@/shared/api/http'
import type { ApiItem } from '@/api-contract/envelopes'
import type { RefreshedSession, Session } from '@/features/auth/types/session'
import type { ChangePasswordBody, LoginBody } from '@/features/auth/types/credentials'

/**
 * Los endpoints de autenticación.
 *
 * Los tres primeros salen del contrato (§3.1). `refresh` todavía no está
 * publicado ahí: lo está implementando el equipo de backend y la forma de la
 * respuesta la confirmaron ellos. Cuando se agregue al contrato hay que
 * verificar que coincida —sobre todo el objeto `user`, que no tiene la misma
 * forma que el del login—.
 *
 * Lo que sigue sin existir: `GET /users/me` y la recuperación de contraseña.
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

/**
 * Renueva el token de acceso.
 *
 * No lleva cuerpo ni encabezado propio: la credencial que lo autoriza es la
 * cookie de renovación, que el navegador manda sola y que este código no
 * puede leer —es `httpOnly` a propósito—.
 *
 * El backend rota la cookie en cada uso: la vieja queda revocada y la
 * respuesta trae una nueva. Por eso no hay que llamar a esto en paralelo; de
 * eso se encarga `http.ts`, que serializa las renovaciones.
 *
 * Un 401 acá significa que la renovación también venció o fue revocada: no
 * hay nada más que intentar, hay que volver a iniciar sesión.
 */
export async function refreshSession(): Promise<RefreshedSession> {
    const response = await http.post<ApiItem<RefreshedSession>>(`${BASE}/refresh`)
    return response.data.data
}
