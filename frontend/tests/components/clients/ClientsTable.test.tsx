import { describe, expect, it } from 'vitest'
import { render, screen, within } from '@testing-library/react'
import { ClientsTable } from '@/features/clients/components/ClientsTable'
import type { Client } from '@/features/clients/types/client'

const GOMEZ: Client = {
    id: 1,
    lastName: 'GÓMEZ',
    firstName: 'Ariel Fernando',
    dni: '34812905',
    phone: '351 415-2288',
    email: 'afgomez@gmail.com',
    clientSince: '2021-03-12',
    activeCases: 2,
    active: true,
}

/** Sin correo y con una sola causa. */
const ACOSTA: Client = {
    id: 4,
    lastName: 'ACOSTA',
    firstName: 'Jonathan E.',
    dni: '38907221',
    phone: '351 744-1160',
    email: null,
    clientSince: '2022-01-19',
    activeCases: 1,
    active: true,
}

/** Sin teléfono y sin causas, con un DNI de siete dígitos. */
const RUIZ: Client = {
    id: 24,
    lastName: 'RUIZ',
    firstName: 'Elvira T.',
    dni: '9876543',
    phone: null,
    email: 'etruiz@gmail.com',
    clientSince: '2026-08-28',
    activeCases: 0,
    active: true,
}

const ROWS = [GOMEZ, ACOSTA, RUIZ]

/** La fila de la tabla de ese cliente. */
function rowOf(name: string) {
    return screen.getByText(name).closest('tr') as HTMLElement
}

describe('ClientsTable', () => {
    /* CA-9.1: las columnas del prototipo. Sin columna de acciones: modificar y
       eliminar un cliente son HU-10 y HU-11, del Sprint 4. */
    it('muestra las columnas del prototipo', () => {
        render(<ClientsTable rows={ROWS} />)

        const headers = screen.getAllByRole('columnheader').map((th) => th.textContent)
        expect(headers).toEqual(['Cliente', 'DNI', 'Teléfono', 'Correo electrónico', 'Causas'])
    })

    it('muestra una fila por cliente, con el apellido primero y desde cuándo es cliente', () => {
        render(<ClientsTable rows={ROWS} />)

        expect(screen.getAllByRole('row')).toHaveLength(ROWS.length + 1)
        const row = rowOf('GÓMEZ, Ariel Fernando')
        expect(within(row).getByText('desde 12/03/2021')).toBeInTheDocument()
        expect(within(row).getByText('351 415-2288')).toBeInTheDocument()
        expect(within(row).getByText('afgomez@gmail.com')).toBeInTheDocument()
    })

    /* CA-8.5: el DNI llega sin puntos y se muestra con puntos. */
    it('muestra el DNI con puntos, tenga 7 u 8 dígitos', () => {
        render(<ClientsTable rows={ROWS} />)

        expect(within(rowOf('GÓMEZ, Ariel Fernando')).getByText('34.812.905')).toBeInTheDocument()
        expect(within(rowOf('RUIZ, Elvira T.')).getByText('9.876.543')).toBeInTheDocument()
    })

    /* CA-9.8: los datos opcionales que faltan. */
    it('un teléfono o un correo que falta se muestra con una raya', () => {
        render(<ClientsTable rows={ROWS} />)

        // Columnas: Cliente, DNI, Teléfono, Correo electrónico, Causas.
        expect(within(rowOf('ACOSTA, Jonathan E.')).getAllByRole('cell')[3]).toHaveTextContent('—')
        expect(within(rowOf('RUIZ, Elvira T.')).getAllByRole('cell')[2]).toHaveTextContent('—')
    })

    /* CA-9.5 y CA-9.6: la cantidad de causas activas, en palabras. */
    it('dice cuántas causas activas tiene cada cliente', () => {
        render(<ClientsTable rows={ROWS} />)

        expect(within(rowOf('GÓMEZ, Ariel Fernando')).getByText('2 causas')).toBeInTheDocument()
        expect(within(rowOf('ACOSTA, Jonathan E.')).getByText('1 causa')).toBeInTheDocument()
        expect(within(rowOf('RUIZ, Elvira T.')).getByText('Sin causas')).toBeInTheDocument()
    })

    /* CA-9.2: el orden lo resuelve el backend; la tabla no reordena. */
    it('respeta el orden en que recibe las filas', () => {
        render(<ClientsTable rows={ROWS} />)

        const names = screen.getAllByText(/^[A-ZÁÉÍÓÚÜÑ]+, /).map((el) => el.textContent)
        expect(names).toEqual(['GÓMEZ, Ariel Fernando', 'ACOSTA, Jonathan E.', 'RUIZ, Elvira T.'])
    })

    it('no ofrece modificar ni eliminar', () => {
        render(<ClientsTable rows={ROWS} />)

        expect(screen.queryByRole('button')).not.toBeInTheDocument()
    })

    it('sin filas muestra el estado vacío que recibe', () => {
        render(<ClientsTable rows={[]} empty={<p>Sin clientes</p>} />)

        expect(screen.getByText('Sin clientes')).toBeInTheDocument()
        expect(screen.queryByRole('table')).not.toBeInTheDocument()
    })
})
