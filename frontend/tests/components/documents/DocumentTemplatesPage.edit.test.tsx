import { describe, expect, it, vi } from 'vitest'
import { fireEvent, screen, waitFor, within } from '@testing-library/react'
import { renderWithProviders } from '../../setup/render'
import { usePrototypeToday } from '../../setup/clock'
import { personNameIn } from '../../setup/names'
import { db } from '@/shared/mocks'
import { formatDate, todayIsoDate } from '@/shared/lib/dates'
import { DocumentTemplatesPage } from '@/features/documents/pages/DocumentTemplatesPage'

/**
 * Modificar modelo formal (HU-36), desde "Modificar" en cada tarjeta. Va en
 * su propio archivo para no pasar el techo de `DocumentTemplatesPage.test.tsx`
 * (TESTING.md §4). El formulario es el del alta, como dice el prototipo:
 * "Nombre del modelo", "Fuero", "Archivo del modelo" y "Copiar en las causas
 * nuevas…", con "Guardar cambios".
 *
 * Donde el prototipo y V6 no coinciden manda V6: los fueros son una lista
 * (D-125) y el archivo es opcional, sin historial (el anterior va a la
 * `Papelera`).
 *
 * Se trabaja sobre "Recurso de casación" (4): penal, `casacion.docx`, se copia
 * a las causas nuevas, última versión del 02/05/2026.
 *
 * @backend CA-36.6 CA-36.7 CA-36.9
 * (las copias del archivo y la `Papelera` en Drive, que las causas no cambian
 * y el `403`: la Secretaría no entra a Modelos, y el `403` del servidor lo
 * prueba `unit/contract/permissions.test.ts`)
 */

vi.setConfig({ testTimeout: 15_000 })

const DOCX = 'application/vnd.openxmlformats-officedocument.wordprocessingml.document'
const CASACION = 'Recurso de casación'

function renderPage(as = 'mrios') {
    return renderWithProviders(<DocumentTemplatesPage />, { as, path: '/modelos', route: '/modelos' })
}

type User = ReturnType<typeof renderPage>['user']

function containerOf(element: HTMLElement, matches: (el: HTMLElement) => boolean): HTMLElement {
    let el: HTMLElement | null = element
    while (el && !matches(el)) el = el.parentElement
    if (!el) throw new Error(`No se encontró el contenedor de "${element.textContent}".`)
    return el
}

async function fueroCard(name: string) {
    const title = await screen.findByText(name, { exact: true })
    return containerOf(title, (el) => el.textContent?.includes('Actualizado') ?? false)
}

/** La tarjeta de un modelo dentro del fuero: la que tiene su "Descargar". */
async function templateCard(name: string) {
    const title = await screen.findByText(name, { exact: true, selector: 'h3' })
    return containerOf(title, (el) => within(el).queryByRole('button', { name: 'Descargar' }) !== null)
}

async function openFuero(user: User, name: string) {
    await user.click(await fueroCard(name))
}

async function openEdit(user: User, name = CASACION) {
    await openFuero(user, 'Penal')
    await user.click(within(await templateCard(name)).getByRole('button', { name: 'Modificar' }))
    return screen.getByRole('dialog', { name: /Modificar modelo formal/ })
}

async function save(user: User, dialog: HTMLElement) {
    await user.click(within(dialog).getByRole('button', { name: 'Guardar cambios' }))
}

/** "Fuero" es un desplegable de selección múltiple: primero se abre. */
async function toggleFuero(user: User, dialog: HTMLElement, fuero: string) {
    if (!within(dialog).queryByRole('checkbox', { name: fuero })) {
        await user.click(within(dialog).getByRole('button', { name: /^fuero/i }))
    }
    await user.click(within(dialog).getByRole('checkbox', { name: fuero }))
}

/**
 * El campo de archivo filtra por `accept`, y `user.upload` respeta ese filtro:
 * un `.pdf` ni siquiera llegaría al formulario. Para probar que el schema lo
 * rechaza se carga con `fireEvent`.
 */
function chooseFile(dialog: HTMLElement, file: File) {
    fireEvent.change(within(dialog).getByLabelText(/^archivo del modelo/i), { target: { files: [file] } })
}

const stored = (id: number) => db.documentTemplates.find((t) => t.id === id)

describe('DocumentTemplatesPage · modificar modelo formal (HU-36)', () => {
    usePrototypeToday()

    /* Prototipo: "Modificar" y "Dar de baja" en cada tarjeta. La sección es
       sólo de Administrador y Abogado (§3.10): los dos los tienen habilitados. */
    it.each([['un abogado', 'mrios'], ['un Administrador sin ficha', 'supervision']])(
        '%s tiene "Modificar" y "Dar de baja" en cada modelo',
        async (_, username) => {
            const { user } = renderPage(username)
            await openFuero(user, 'Penal')

            const card = within(await templateCard(CASACION))
            expect(card.getByRole('button', { name: 'Modificar' })).toBeEnabled()
            expect(card.getByRole('button', { name: 'Dar de baja' })).toBeEnabled()
        },
    )

    /* Prototipo: el subtítulo es el nombre, y el formulario abre con los datos
       del modelo. El archivo actual se ve; elegir otro es opcional. */
    it('abre con los datos del modelo y su archivo actual', async () => {
        const { user } = renderPage()
        const dialog = await openEdit(user)

        expect(within(dialog).getByText(CASACION)).toBeInTheDocument()
        expect(within(dialog).getByLabelText(/^nombre del modelo/i)).toHaveValue(CASACION)
        expect(within(dialog).getByRole('checkbox', { name: /^copiar en las causas nuevas/i })).toBeChecked()
        expect(within(dialog).getByText('casacion.docx')).toBeInTheDocument()

        await user.click(within(dialog).getByRole('button', { name: /^fuero/i }))
        expect(within(dialog).getByRole('checkbox', { name: 'Penal' })).toBeChecked()
        expect(within(dialog).getByRole('checkbox', { name: 'Amparo' })).not.toBeChecked()
    })

    /* CA-36.1: los cambios quedan guardados. El aviso es el del prototipo. */
    it('cambia el nombre, avisa y lo muestra en la tarjeta', async () => {
        const { user } = renderPage()
        const dialog = await openEdit(user)

        const name = within(dialog).getByLabelText(/^nombre del modelo/i)
        await user.clear(name)
        await user.type(name, 'Recurso de casación penal')
        await save(user, dialog)

        expect(
            await screen.findByText('Modelo actualizado. Las causas ya creadas conservan la copia anterior.'),
        ).toBeInTheDocument()
        expect(screen.queryByRole('dialog')).not.toBeInTheDocument()
        expect(await templateCard('Recurso de casación penal')).toHaveTextContent('casacion.docx')
        // Cambiar sólo el nombre no mueve la última versión (§3.10).
        expect(stored(4)).toMatchObject({ name: 'Recurso de casación penal', lastVersionAt: '2026-05-02T10:00:00-03:00' })
    })

    /* CA-36.1: un PATCH vacío es un 400, así que sin cambios no se llama. */
    it('guardar sin cambios cierra el diálogo y no cambia nada', async () => {
        const before = { ...stored(4) }
        const { user } = renderPage()
        const dialog = await openEdit(user)

        await save(user, dialog)

        await waitFor(() => expect(screen.queryByRole('dialog')).not.toBeInTheDocument())
        expect(screen.queryByText(/Modelo actualizado/)).not.toBeInTheDocument()
        expect(stored(4)).toEqual(before)
    })

    /* CA-36.2 (D-125) y CA-36.6: los fueros son una lista; el modelo sigue
       siendo uno y aparece en la vista de cada fuero. */
    it('sumar un fuero lo muestra también en ese fuero', async () => {
        const { user } = renderPage()
        const dialog = await openEdit(user)

        await toggleFuero(user, dialog, 'Amparo')
        await save(user, dialog)

        expect(await screen.findByText(/Modelo actualizado/)).toBeInTheDocument()
        expect(stored(4)?.jurisdictions).toEqual(['CRIMINAL', 'AMPARO'])
        await user.click(screen.getByRole('button', { name: 'Fueros' }))
        await openFuero(user, 'Amparo')
        expect(await templateCard(CASACION)).toBeInTheDocument()
    })

    /* CA-36.2: al menos un fuero. */
    it('sin ningún fuero no deja guardar y lo marca', async () => {
        const { user } = renderPage()
        const dialog = await openEdit(user)

        await toggleFuero(user, dialog, 'Penal')
        await save(user, dialog)

        expect(within(dialog).getByText('Elegí al menos un fuero.')).toBeInTheDocument()
        expect(stored(4)?.jurisdictions).toEqual(['CRIMINAL'])
    })

    /* CA-36.4: el archivo nuevo reemplaza al anterior, y la última versión
       pasa a ser la del reemplazo: hoy, y quien lo subió. */
    it('reemplaza el archivo y la tarjeta muestra la versión nueva', async () => {
        const { user } = renderPage()
        const dialog = await openEdit(user)

        await user.upload(
            within(dialog).getByLabelText(/^archivo del modelo/i),
            new File(['nuevo'], 'casacion-2026.docx', { type: DOCX }),
        )
        await save(user, dialog)

        expect(await screen.findByText(/Modelo actualizado/)).toBeInTheDocument()
        const card = await templateCard(CASACION)
        await waitFor(() => expect(card).toHaveTextContent('casacion-2026.docx'))
        expect(card).toHaveTextContent(`Última versión ${formatDate(todayIsoDate())}`)
        expect(card).toHaveTextContent(new RegExp(personNameIn('Ríos', 'Malena')))
    })

    /* CA-36.5: sólo un documento Word. */
    it('un archivo que no es .docx se marca en su campo', async () => {
        const { user } = renderPage()
        const dialog = await openEdit(user)

        chooseFile(dialog, new File(['x'], 'casacion.pdf', { type: 'application/pdf' }))
        await save(user, dialog)

        expect(within(dialog).getByText('El archivo tiene que ser .docx.')).toBeInTheDocument()
        expect(stored(4)?.fileName).toBe('casacion.docx')
    })

    /* CA-36.3 (D-139): el nombre de otro modelo vigente es un 409 del campo;
       el de uno dado de baja ("Amparo por mora…", el 13) está libre (CA-37.5). */
    it('el nombre de otro modelo vigente se rechaza en su campo; el de uno dado de baja se acepta', async () => {
        const { user } = renderPage()
        const dialog = await openEdit(user)

        const name = within(dialog).getByLabelText(/^nombre del modelo/i)
        await user.clear(name)
        await user.type(name, 'ofrecimiento de prueba')
        await save(user, dialog)

        expect(await within(dialog).findByText('Ya existe un modelo formal con ese nombre.')).toBeInTheDocument()
        expect(name.closest('.vz-field')).toHaveClass('vz-field--error')
        expect(stored(4)?.name).toBe(CASACION)

        await user.clear(name)
        await user.type(name, 'Amparo por mora de la administración')
        await save(user, dialog)

        expect(await screen.findByText(/Modelo actualizado/)).toBeInTheDocument()
        expect(stored(4)?.name).toBe('Amparo por mora de la administración')
    })

    /* CA-36.8: si Drive no responde al guardar el archivo nuevo, el modelo no cambia. */
    it('si Drive no responde al reemplazar el archivo, avisa y no cambia nada', async () => {
        db.failures.documentStorage = true
        const { user } = renderPage()
        const dialog = await openEdit(user)

        await user.upload(
            within(dialog).getByLabelText(/^archivo del modelo/i),
            new File(['nuevo'], 'casacion-2026.docx', { type: DOCX }),
        )
        await save(user, dialog)

        expect(
            await screen.findByText('No se pudo acceder al almacenamiento en la nube. Intentá de nuevo en unos minutos.'),
        ).toBeInTheDocument()
        expect(screen.getByRole('dialog')).toBeInTheDocument()
        expect(stored(4)?.fileName).toBe('casacion.docx')
    })

    /* CA-36.10: lo dieron de baja con el diálogo abierto. El aviso es el del backend. */
    it('si el modelo ya no existe, avisa, cierra el diálogo y lo saca de la lista', async () => {
        const { user } = renderPage()
        const dialog = await openEdit(user)

        const template = stored(4)
        if (template) template.active = false
        const name = within(dialog).getByLabelText(/^nombre del modelo/i)
        await user.type(name, ' penal')
        await save(user, dialog)

        expect(await screen.findByText('No se encontró el modelo formal solicitado.')).toBeInTheDocument()
        await waitFor(() => expect(screen.queryByRole('dialog')).not.toBeInTheDocument())
        await waitFor(() => expect(screen.queryByText(CASACION, { selector: 'h3' })).not.toBeInTheDocument())
    })
})
