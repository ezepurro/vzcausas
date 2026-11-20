import { describe, expect, it } from 'vitest'
import { screen, waitFor, within } from '@testing-library/react'
import { http, HttpResponse } from 'msw'
import { renderWithProviders } from '../../setup/render'
import { personName } from '../../setup/names'
import { server } from '@/shared/mocks/server'
import { db, errorBody } from '@/shared/mocks'
import { LawyersPage } from '@/features/lawyers/pages/LawyersPage'

/**
 * Eliminar abogado (HU-15, V6 §3.3), desde "Eliminar" en cada fila. Los textos
 * salen del formulario "Eliminar abogado" del prototipo: "Tiene N causas
 * activas…", "Sin asignar", "Pasan a" y "Eliminar y reasignar".
 *
 * Desde D-143 no hace falta asignarlas todas: las que se confirman sin
 * asignar quedan huérfanas, sin responsable. Antes de enviar se avisa, se
 * listan y se pide confirmar (`lawyers/CAMBIOS.md`).
 *
 * Peralta (4) tiene dos causas activas (2 y 11), una terminal (21) y el
 * usuario `iperalta`, que solo es Abogado. Zárate (2) tiene un usuario que
 * además es Administrador. Campos (9) no tiene causas ni usuario.
 *
 * @backend CA-15.4 CA-15.6 CA-15.11 CA-15.12
 * (detalle de la causa terminal, auditoría, Drive y reportes: no tienen
 * pantalla acá)
 */

function renderPage(as = 'fvazquez') {
    return renderWithProviders(<LawyersPage />, {
        as,
        path: '/abogados',
        route: '/abogados',
    })
}

const PERALTA = personName('Peralta', 'Ignacio', { exact: false })
const ZARATE = personName('Zárate', 'Oscar', { exact: false })
const CAMPOS = personName('Campos', 'Julieta', { exact: false })

function caption(id: number): string {
    return db.cases.find((c) => c.id === id)?.caption ?? ''
}

async function openDelete(user: ReturnType<typeof renderPage>['user'], name: RegExp) {
    const row = (await screen.findByText(name)).closest('tr') as HTMLElement
    await user.click(within(row).getByRole('button', { name: 'Eliminar' }))
    return screen.getByRole('dialog', { name: /Eliminar abogado/ })
}

/** El diálogo de ahora: el paso de confirmación lo vuelve a dibujar. */
function currentDialog() {
    return screen.getByRole('dialog', { name: /Eliminar abogado/ })
}

/** "Eliminar y reasignar" y, como el abogado tiene usuario vinculado, "Confirmar y eliminar" (CA-15.5). */
async function submitAndConfirm(user: ReturnType<typeof renderPage>['user']) {
    await user.click(within(currentDialog()).getByRole('button', { name: 'Eliminar y reasignar' }))
    await user.click(await within(currentDialog()).findByRole('button', { name: 'Confirmar y eliminar' }))
}

describe('LawyersPage · eliminar abogado', () => {
    // CA-15.1: sin causas activas se da de baja sin reparto.
    it('un abogado sin causas activas se elimina y sale del listado', async () => {
        const { user } = renderPage()
        const dialog = await openDelete(user, CAMPOS)

        expect(await within(dialog).findByText(/No tiene causas activas/)).toBeInTheDocument()
        await user.click(within(dialog).getByRole('button', { name: 'Eliminar' }))

        expect(await screen.findByText(/Abogado Campos, Julieta eliminado/)).toBeInTheDocument()
        expect(db.lawyers.find((l) => l.id === 9)?.active).toBe(false)
        // El nombre exacto es el de la celda: el aviso también lo nombra.
        await waitFor(() => expect(screen.queryByText(personName('Campos', 'Julieta'))).not.toBeInTheDocument())
    })

    // CA-15.2: lista solo las activas; las terminales no se reparten.
    it('lista solo sus causas activas y deja confirmar aunque queden sin asignar', async () => {
        const { user } = renderPage()
        const dialog = await openDelete(user, PERALTA)

        expect(await within(dialog).findByText('Tiene 2 causas activas. Las que no asignes quedan sin responsable.')).toBeInTheDocument()
        expect(within(dialog).getByText('Sin asignar · 2 de 2')).toBeInTheDocument()
        expect(within(dialog).getByText(caption(2))).toBeInTheDocument()
        expect(within(dialog).getByText(caption(11))).toBeInTheDocument()
        expect(within(dialog).queryByText(caption(21))).not.toBeInTheDocument()
        // D-143: sin asignar no bloquea; lo frena la confirmación.
        expect(within(dialog).getByRole('button', { name: 'Eliminar y reasignar' })).toBeEnabled()
    })

    // CA-15.2 y CA-15.8: se reparten entre varios abogados en la misma operación.
    it('reparte las causas entre dos abogados y las reasigna al confirmar', async () => {
        const { user } = renderPage()
        const dialog = await openDelete(user, PERALTA)

        await user.click(await within(dialog).findByRole('checkbox', { name: new RegExp(escape(caption(2))) }))
        await user.click(within(dialog).getByRole('button', { name: /Asignar 1 a Bustos, Carolina/ }))
        await user.click(within(dialog).getByRole('checkbox', { name: new RegExp(escape(caption(11))) }))
        await user.click(within(dialog).getByRole('button', { name: /Asignar 1 a Ríos, Malena/ }))

        expect(within(dialog).getByText('Todas las causas tienen abogado asignado.')).toBeInTheDocument()
        await submitAndConfirm(user)

        expect(await screen.findByText(/Causas reasignadas: .*Bustos \(1\).*Abogado Peralta, Ignacio eliminado/)).toBeInTheDocument()
        expect(db.cases.find((c) => c.id === 2)?.responsibleLawyerId).toBe(5)
        expect(db.cases.find((c) => c.id === 11)?.responsibleLawyerId).toBe(3)
        // La terminal queda con él, como su historial.
        expect(db.cases.find((c) => c.id === 21)?.responsibleLawyerId).toBe(4)
        expect(db.lawyers.find((l) => l.id === 4)?.active).toBe(false)
    })

    // "Marcar todas" y "Quitar todas" del prototipo.
    it('marca todas, las asigna a un abogado y las puede quitar', async () => {
        const { user } = renderPage()
        const dialog = await openDelete(user, PERALTA)

        await user.click(await within(dialog).findByRole('button', { name: 'Marcar todas' }))
        await user.click(within(dialog).getByRole('button', { name: /Asignar 2 a Bustos, Carolina/ }))
        expect(within(dialog).getByText('Sin asignar · 0 de 2')).toBeInTheDocument()

        await user.click(within(dialog).getByRole('button', { name: /Quitar todas las de Bustos, Carolina/ }))
        expect(within(dialog).getByText('Sin asignar · 2 de 2')).toBeInTheDocument()
    })

    // D-143: las que no se asignan quedan huérfanas; la confirmación las lista (V6 §3.3).
    it('avisa cuáles quedan sin asignar, pide confirmar y las manda con unassigned', async () => {
        const { user } = renderPage()
        const dialog = await openDelete(user, PERALTA)

        await user.click(await within(dialog).findByRole('checkbox', { name: new RegExp(escape(caption(2))) }))
        await user.click(within(dialog).getByRole('button', { name: /Asignar 1 a Bustos, Carolina/ }))
        await user.click(within(dialog).getByRole('button', { name: 'Eliminar y reasignar' }))

        const confirm = currentDialog()
        expect(await within(confirm).findByText(/Se reasigna 1 causa y se da de baja a Peralta, Ignacio/)).toBeInTheDocument()
        expect(within(confirm).getByText('Queda sin asignar · 1')).toBeInTheDocument()
        expect(within(confirm).getByText('Sin responsable hasta que se la reasigne.')).toBeInTheDocument()
        const orphans = within(confirm).getByRole('list', { name: 'Causas que quedan sin asignar' })
        expect(within(orphans).getByText(caption(11))).toBeInTheDocument()
        expect(within(orphans).queryByText(caption(2))).not.toBeInTheDocument()
        await user.click(within(confirm).getByRole('button', { name: 'Confirmar y eliminar' }))

        expect(await screen.findByText(/Causas reasignadas: Bustos \(1\)\. 1 causa queda sin asignar\. Abogado Peralta, Ignacio eliminado/)).toBeInTheDocument()
        expect(db.cases.find((c) => c.id === 2)?.responsibleLawyerId).toBe(5)
        const orphan = db.cases.find((c) => c.id === 11)
        expect(orphan?.responsibleLawyerId).toBeNull()
        expect(orphan?.orphanedAt).not.toBeNull()
    })

    // D-143: sin usuario vinculado igual confirma, si quedan causas sin asignar.
    it('sin usuario vinculado, igual pide confirmar si quedan causas sin asignar', async () => {
        const linked = db.users.find((u) => u.username === 'iperalta')
        if (linked) linked.lawyerId = null
        const { user } = renderPage()
        const dialog = await openDelete(user, PERALTA)

        await within(dialog).findByText('Sin asignar · 2 de 2')
        await user.click(within(dialog).getByRole('button', { name: 'Eliminar y reasignar' }))

        const confirm = currentDialog()
        expect(await within(confirm).findByText('Quedan sin asignar · 2')).toBeInTheDocument()
        expect(within(confirm).getByText(/^Se da de baja a Peralta, Ignacio/)).toBeInTheDocument()
        expect(within(confirm).queryByText(/El usuario iperalta/)).not.toBeInTheDocument()
        expect(db.lawyers.find((l) => l.id === 4)?.active).toBe(true)
        await user.click(within(confirm).getByRole('button', { name: 'Confirmar y eliminar' }))

        await screen.findByText(/2 causas quedan sin asignar\. Abogado Peralta, Ignacio eliminado/)
        expect(db.cases.filter((c) => c.responsibleLawyerId === null).map((c) => c.id)).toEqual(expect.arrayContaining([2, 11]))
    })

    // CA-15.3: el que se da de baja no es destino de su propio reparto.
    it('el abogado que se elimina no figura en "Pasan a"', async () => {
        const { user } = renderPage()
        const dialog = await openDelete(user, PERALTA)

        await user.click(await within(dialog).findByRole('button', { name: 'Marcar todas' }))
        expect(within(dialog).queryByRole('button', { name: /Asignar 2 a Peralta/ })).not.toBeInTheDocument()
        expect(within(dialog).getByRole('button', { name: /Asignar 2 a Bustos, Carolina/ })).toBeInTheDocument()
    })

    // CA-15.5: el aviso del usuario vinculado se confirma después de "Eliminar y reasignar".
    it('al tocar "Eliminar y reasignar" pide confirmar que el usuario también queda dado de baja', async () => {
        const { user } = renderPage()
        const dialog = await openDelete(user, PERALTA)

        await user.click(await within(dialog).findByRole('button', { name: 'Marcar todas' }))
        await user.click(within(dialog).getByRole('button', { name: /Asignar 2 a Bustos, Carolina/ }))
        // Antes de tocar el botón el aviso no está.
        expect(within(dialog).queryByText(/El usuario iperalta/)).not.toBeInTheDocument()
        await user.click(within(dialog).getByRole('button', { name: 'Eliminar y reasignar' }))

        expect(await within(currentDialog()).findByText(/El usuario iperalta también queda dado de baja/)).toBeInTheDocument()
        expect(db.lawyers.find((l) => l.id === 4)?.active).toBe(true)
        await user.click(within(currentDialog()).getByRole('button', { name: 'Confirmar y eliminar' }))

        await screen.findByText(/Abogado Peralta, Ignacio eliminado/)
        expect(db.users.find((u) => u.username === 'iperalta')?.active).toBe(false)
    })

    it('"Volver" en la confirmación vuelve al reparto sin dar de baja', async () => {
        const { user } = renderPage()
        const dialog = await openDelete(user, PERALTA)

        await user.click(await within(dialog).findByRole('button', { name: 'Marcar todas' }))
        await user.click(within(dialog).getByRole('button', { name: /Asignar 2 a Bustos, Carolina/ }))
        await user.click(within(dialog).getByRole('button', { name: 'Eliminar y reasignar' }))
        await user.click(await within(currentDialog()).findByRole('button', { name: 'Volver' }))

        expect(within(currentDialog()).getByText('Sin asignar · 0 de 2')).toBeInTheDocument()
        expect(db.lawyers.find((l) => l.id === 4)?.active).toBe(true)
    })

    // CA-15.5: con otros perfiles sigue vigente y pierde el de Abogado.
    it('con otros perfiles, la confirmación avisa que el usuario pierde el perfil Abogado', async () => {
        const { user } = renderPage()
        const dialog = await openDelete(user, ZARATE)

        await user.click(await within(dialog).findByRole('button', { name: 'Marcar todas' }))
        await user.click(within(dialog).getByRole('button', { name: /Asignar 2 a Bustos, Carolina/ }))
        await user.click(within(dialog).getByRole('button', { name: 'Eliminar y reasignar' }))

        expect(await within(currentDialog()).findByText(/El usuario ozarate pierde el perfil Abogado/)).toBeInTheDocument()
    })

    // Sin usuario vinculado no hay paso de confirmación.
    it('sin usuario vinculado se elimina sin confirmar', async () => {
        const { user } = renderPage()
        const dialog = await openDelete(user, CAMPOS)

        await within(dialog).findByText(/No tiene causas activas/)
        await user.click(within(dialog).getByRole('button', { name: 'Eliminar' }))

        expect(screen.queryByRole('button', { name: 'Confirmar y eliminar' })).not.toBeInTheDocument()
        await screen.findByText(/Abogado Campos, Julieta eliminado/)
    })

    // CA-15.7: solo el Administrador da de baja abogados.
    it('la Secretaría ve "Eliminar" deshabilitado', async () => {
        renderPage('gestion')
        const row = (await screen.findByText(PERALTA)).closest('tr') as HTMLElement

        expect(within(row).getByRole('button', { name: 'Eliminar' })).toBeDisabled()
        expect(screen.getByText('Solo el Administrador registra, modifica y elimina abogados.')).toBeInTheDocument()
    })

    // CA-15.10: una causa nueva mientras el formulario estaba abierto.
    it('con un 409 vuelve a pedir sus causas y muestra la nueva sin asignar', async () => {
        const { user } = renderPage()
        const dialog = await openDelete(user, PERALTA)

        await user.click(await within(dialog).findByRole('button', { name: 'Marcar todas' }))
        await user.click(within(dialog).getByRole('button', { name: /Asignar 2 a Bustos, Carolina/ }))

        // Mientras tanto le asignan otra causa activa.
        const other = db.cases.find((c) => c.id === 3)
        if (other) other.responsibleLawyerId = 4

        await submitAndConfirm(user)

        // El rechazo vuelve al reparto.
        expect(await within(currentDialog()).findByText(/El abogado tiene causas activas sin reasignar/)).toBeInTheDocument()
        expect(await within(currentDialog()).findByText('Sin asignar · 1 de 3')).toBeInTheDocument()
        expect(within(currentDialog()).getByText(caption(3))).toBeInTheDocument()
        expect(db.lawyers.find((l) => l.id === 4)?.active).toBe(true)
    })

    // CA-15.9: el detalle del reparto inválido va en el formulario.
    it('un 400 del reparto se muestra en el formulario y no cambia nada', async () => {
        server.use(
            http.delete('*/lawyers/:lawyerId', () =>
                HttpResponse.json(
                    errorBody('VALIDATION_ERROR', 'Los datos enviados no son válidos.', {
                        reassignments: 'La causa 2 no es una causa activa de este abogado.',
                    }),
                    { status: 400 },
                ),
            ),
        )
        const { user } = renderPage()
        const dialog = await openDelete(user, PERALTA)

        await user.click(await within(dialog).findByRole('button', { name: 'Marcar todas' }))
        await user.click(within(dialog).getByRole('button', { name: /Asignar 2 a Bustos, Carolina/ }))
        await submitAndConfirm(user)

        expect(await within(currentDialog()).findByText('La causa 2 no es una causa activa de este abogado.')).toBeInTheDocument()
        expect(db.lawyers.find((l) => l.id === 4)?.active).toBe(true)
    })

    // CA-15.13: ya dado de baja por otro.
    it('un abogado que ya no existe muestra el error y vuelve a aparecer el listado', async () => {
        server.use(
            http.delete('*/lawyers/:lawyerId', () =>
                HttpResponse.json(errorBody('LAWYER_NOT_FOUND', 'No se encontró el abogado solicitado.'), { status: 404 }),
            ),
        )
        const { user } = renderPage()
        const dialog = await openDelete(user, CAMPOS)

        await within(dialog).findByText(/No tiene causas activas/)
        await user.click(within(dialog).getByRole('button', { name: 'Eliminar' }))

        expect(await screen.findByText('No se encontró el abogado solicitado.')).toBeInTheDocument()
        expect(screen.queryByRole('dialog', { name: /Eliminar abogado/ })).not.toBeInTheDocument()
    })
})

function escape(text: string): string {
    return text.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
}
