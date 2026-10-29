/**
 * Pasos compartidos por los E2E.
 *
 * **Ojo con recargar la página.** Los E2E corren contra la app con los mocks
 * de MSW encendidos, y el mock guarda sus datos —incluidas las sesiones— en la
 * memoria de la pestaña. Un `page.goto()` o un `page.reload()` después del
 * login vuelve todo al estado semilla: el token guardado deja de existir para
 * el mock y la app te devuelve al login. Por eso, una vez adentro, se navega
 * con el menú (`goTo`), igual que lo haría una persona.
 */

import { expect, type Page } from '@playwright/test'

/**
 * Usuarios de los fixtures del mock (`src/shared/mocks/fixtures.ts`), con la
 * pantalla a la que entra cada uno: `/inicio` si tiene algún tablero y, si no
 * (la Secretaría), `/causas` (`homeRoute`, CA-41.13).
 */
export const USERS = {
    /** Administrador y abogado: pasa todos los endpoints de administración. */
    admin: { username: 'fvazquez', password: 'password1', fullName: 'Fernando G. Vázquez', home: '/inicio' },
    /** Sólo abogado: recibe 403 en administración. */
    lawyer: { username: 'mrios', password: 'abogado123', fullName: 'Malena Ríos', home: '/inicio' },
    /** Secretaría, sin ficha profesional ni tablero. */
    secretary: { username: 'gestion', password: 'secre123', fullName: 'Gestión Estudio', home: '/causas' },
} as const

export type UserKey = keyof typeof USERS

/**
 * Entra por el formulario de login y espera a llegar a su pantalla de entrada.
 * Que entró se confirma con su nombre en el menú lateral, que está en todas
 * las pantallas: no depende del saludo del tablero, que la Secretaría no ve.
 */
export async function loginAs(page: Page, who: UserKey = 'admin') {
    const { username, password, fullName, home } = USERS[who]

    await page.goto('/login')
    await page.getByLabel('Usuario').fill(username)
    await page.getByLabel('Contraseña').fill(password)
    await page.getByRole('button', { name: 'Ingresar' }).click()

    await expect(page).toHaveURL(new RegExp(`${home}$`))
    await expect(
        page.getByRole('navigation', { name: 'Navegación principal' }).getByText(fullName),
    ).toBeVisible()
}

/** Navega con el menú lateral, sin recargar la página. */
export async function goTo(page: Page, section: string) {
    await page
        .getByRole('navigation', { name: 'Navegación principal' })
        .getByRole('button', { name: section, exact: true })
        .click()
}
