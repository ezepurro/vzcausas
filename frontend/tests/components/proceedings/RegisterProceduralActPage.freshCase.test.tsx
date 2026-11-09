import { describe, expect, it } from 'vitest'
import { screen, within } from '@testing-library/react'
import { CaseDetailPage } from '@/features/cases/pages/CaseDetailPage'
import { RegisterProceduralActPage } from '@/features/proceedings/pages/RegisterProceduralActPage'
import { renderWithProviders } from '../../setup/render'
import { usePrototypeToday } from '../../setup/clock'

/**
 * Volver al detalle después de registrar un acto, con la caché de la causa ya
 * llena. Con demora de red, la mutación terminaba antes de que llegara la
 * causa nueva y el detalle mostraba por un instante el estado viejo y la línea
 * de vida sin el acto. Ahora la mutación espera las dos (`refreshCaseAfterAct`):
 * el detalle aparece ya cambiado, sin `waitFor`.
 *
 * Va en su propio archivo: dentro de `RegisterProceduralActPage.test.tsx`,
 * después de los demás tests, el detalle de entrada queda en un loop de `401`
 * con la renovación de la sesión (pasa sólo con el archivo entero, no con
 * ningún test anterior por separado).
 *
 * La causa 1 (penal, de `mrios`) está en "Oposición al requerimiento de
 * elevación" y su línea de vida tiene cuatro movimientos.
 */
describe('RegisterProceduralActPage · vuelta al detalle', () => {
    usePrototypeToday()

    it('vuelve al detalle con la causa y la línea de vida ya actualizadas, sin mostrar las viejas', async () => {
        // Se entra desde el detalle para que la causa y la línea de vida viejas estén en la caché.
        const { user } = renderWithProviders(<CaseDetailPage />, {
            as: 'mrios',
            route: '/causas/1',
            path: '/causas/:caseId',
            routes: [{ path: '/causas/:caseId/acto', element: <RegisterProceduralActPage /> }],
        })
        const timeline = () =>
            screen.getByText('Ciclo de vida de la causa', { selector: '.vz-panel__title' })
                .closest('.vz-panel') as HTMLElement
        await screen.findByText('Ciclo de vida de la causa', { selector: '.vz-panel__title' })
        expect(await within(timeline()).findAllByRole('listitem')).toHaveLength(4)

        await user.click(screen.getByRole('button', { name: 'Registrar acto procesal' }))
        await user.click(await screen.findByRole('combobox'))
        await user.click(screen.getByRole('option', { name: /Cédula de notificación/ }))
        await user.click(screen.getByRole('button', { name: 'Registrar acto' }))

        /* Se espera a estar de vuelta en el detalle: su botón sólo está ahí (el
           encabezado lo muestra también el formulario del acto). Con margen:
           la mutación termina recién cuando llegaron la causa y su línea de vida. */
        await screen.findByRole('button', { name: 'Registrar acto procesal' }, { timeout: 3000 })

        // Lo primero que se ve del detalle ya es la causa nueva.
        const header = screen.getByRole('region', { name: 'Causa 13284571' })
        expect(header).toHaveTextContent('Cédula de notificación')
        expect(header).not.toHaveTextContent('Oposición al requerimiento de elevación')
        // Y la línea de vida ya trae el acto nuevo, primero.
        const items = within(timeline()).getAllByRole('listitem')
        expect(items).toHaveLength(5)
        expect(items[0]).toHaveTextContent('Cédula de notificación')
    })
})
