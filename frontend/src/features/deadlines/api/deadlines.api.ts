import { http } from '@/shared/api/http'
import type { DailyRunResult } from '@/features/deadlines/types/dailyRun'

const DAILY_RUN_PATH = '/internal/deadlines/daily-run'

/** Envía correos de verdad, y eso puede tardar más que los 15 s de `http`. */
const DAILY_RUN_TIMEOUT_MS = 120_000

/**
 * El secreto se lee adentro de esta condición para que el build de producción
 * no lo incluya: Vite reemplaza `DEV` por `false` y descarta esta rama.
 */
const INTERNAL_TRIGGER_SECRET: string | undefined =
    import.meta.env.DEV && import.meta.env.VITE_USE_MOCKS !== 'true'
        ? import.meta.env.VITE_INTERNAL_TRIGGER_SECRET
        : undefined

/** Sólo en desarrollo, contra el backend real y con el secreto cargado. */
export const DAILY_RUN_ENABLED = Boolean(INTERNAL_TRIGGER_SECRET)

/**
 * Dispara a mano la corrida que en producción lanza GitHub Actions. Es un
 * atajo local: el endpoint no está en el contrato (`CAMBIOS.md`).
 *
 * `dev=true` le pide al backend que borre antes el historial de avisos
 * enviados (`sent_notifications`), así la campanita se puede apretar todas las
 * veces que haga falta. El backend sólo lo acepta con `NODE_ENV=development`.
 */
export async function runDailyNotifications(): Promise<DailyRunResult> {
    const res = await http.post<DailyRunResult>(DAILY_RUN_PATH, undefined, {
        params: { dev: true },
        timeout: DAILY_RUN_TIMEOUT_MS,
        headers: { 'x-internal-trigger-secret': INTERNAL_TRIGGER_SECRET },
    })

    return res.data
}
