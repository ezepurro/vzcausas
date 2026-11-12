import { useState } from 'react'
import { describe, expect, it, vi } from 'vitest'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { SearchSelect, type SearchSelectOption } from '@/shared/components/forms'

const CLIENTS: SearchSelectOption[] = [
    { value: '1', label: 'GÓMEZ, Ariel Fernando · DNI 34.812.905' },
    { value: '2', label: 'PEREYRA, Marcos · DNI 29.114.672' },
    { value: '3', label: 'MOYANO, Daniela · Pasaporte AAE482915' },
]

function Harness({ onSearch, onSelect, initial = '' }: {
    onSearch?: (text: string) => void
    onSelect?: (value: string) => void
    initial?: string
}) {
    const [value, setValue] = useState(initial)
    return (
        <>
            <label htmlFor="client">Cliente</label>
            <SearchSelect
                id="client"
                value={value}
                options={CLIENTS}
                placeholder="Seleccionar cliente…"
                clearLabel="Quitar el cliente elegido"
                onSearch={onSearch}
                onSelect={(next) => {
                    setValue(next)
                    onSelect?.(next)
                }}
            />
        </>
    )
}

/** Un select en el que se puede escribir para filtrar (H-29). */
describe('SearchSelect', () => {
    it('al abrirlo muestra todas las opciones, como un select', async () => {
        const user = userEvent.setup()
        render(<Harness />)

        expect(screen.queryByRole('listbox')).not.toBeInTheDocument()
        await user.click(screen.getByLabelText('Cliente'))

        expect(screen.getAllByRole('option')).toHaveLength(3)
    })

    it('al escribir quedan las que coinciden, sin distinguir acentos ni mayúsculas', async () => {
        const user = userEvent.setup()
        render(<Harness />)

        await user.type(screen.getByLabelText('Cliente'), 'gomez ariel')

        expect(screen.getAllByRole('option')).toHaveLength(1)
        expect(screen.getByRole('option', { name: /^GÓMEZ/ })).toBeInTheDocument()
    })

    it('encuentra un DNI escrito sin puntos', async () => {
        const user = userEvent.setup()
        render(<Harness />)

        await user.type(screen.getByLabelText('Cliente'), '29114672')

        expect(screen.getByRole('option', { name: /^PEREYRA/ })).toBeInTheDocument()
        expect(screen.getAllByRole('option')).toHaveLength(1)
    })

    it('elegir una opción la deja en el campo y cierra la lista', async () => {
        const user = userEvent.setup()
        const onSelect = vi.fn()
        render(<Harness onSelect={onSelect} />)

        await user.click(screen.getByLabelText('Cliente'))
        await user.click(screen.getByRole('option', { name: /^MOYANO/ }))

        expect(onSelect).toHaveBeenCalledWith('3')
        expect(screen.getByLabelText('Cliente')).toHaveValue('MOYANO, Daniela · Pasaporte AAE482915')
        expect(screen.queryByRole('listbox')).not.toBeInTheDocument()
    })

    it('con el teclado: flechas para moverse y Enter para elegir', async () => {
        const user = userEvent.setup()
        const onSelect = vi.fn()
        render(<Harness onSelect={onSelect} />)

        await user.click(screen.getByLabelText('Cliente'))
        await user.keyboard('{ArrowDown}{ArrowDown}{Enter}')

        expect(onSelect).toHaveBeenCalledWith('2')
    })

    it('Enter con una sola coincidencia la elige sin bajar con la flecha', async () => {
        const user = userEvent.setup()
        const onSelect = vi.fn()
        render(<Harness onSelect={onSelect} />)

        await user.type(screen.getByLabelText('Cliente'), 'moyano{Enter}')

        expect(onSelect).toHaveBeenCalledWith('3')
    })

    it('lo escrito no es un valor: al salir sin elegir vuelve lo que estaba', async () => {
        const user = userEvent.setup()
        const onSelect = vi.fn()
        render(<Harness initial="1" onSelect={onSelect} />)

        await user.type(screen.getByLabelText('Cliente'), 'perey')
        await user.tab()

        expect(onSelect).not.toHaveBeenCalled()
        expect(screen.getByLabelText('Cliente')).toHaveValue('GÓMEZ, Ariel Fernando · DNI 34.812.905')
    })

    it('sin coincidencias lo dice', async () => {
        const user = userEvent.setup()
        render(<Harness />)

        await user.type(screen.getByLabelText('Cliente'), 'zzz')

        expect(screen.queryByRole('option')).not.toBeInTheDocument()
        expect(screen.getByText('Sin resultados.')).toBeInTheDocument()
    })

    it('avisa lo que se escribe, y vacío al cerrarse, para buscar en el servidor', async () => {
        const user = userEvent.setup()
        const onSearch = vi.fn()
        render(<Harness onSearch={onSearch} />)

        await user.type(screen.getByLabelText('Cliente'), 'go')
        expect(onSearch).toHaveBeenLastCalledWith('go')

        await user.tab()
        expect(onSearch).toHaveBeenLastCalledWith('')
    })

    it('Escape cierra la lista sin llegar a quien escuche afuera (un modal)', async () => {
        const user = userEvent.setup()
        const outside = vi.fn()
        document.addEventListener('keydown', outside)
        render(<Harness />)

        await user.click(screen.getByLabelText('Cliente'))
        await user.keyboard('{Escape}')

        expect(screen.queryByRole('listbox')).not.toBeInTheDocument()
        expect(outside).not.toHaveBeenCalled()
        document.removeEventListener('keydown', outside)
    })

    it('la "×" saca la elección', async () => {
        const user = userEvent.setup()
        const onSelect = vi.fn()
        render(<Harness initial="1" onSelect={onSelect} />)

        await user.click(screen.getByRole('button', { name: 'Quitar el cliente elegido' }))

        expect(onSelect).toHaveBeenCalledWith('')
        expect(screen.getByLabelText('Cliente')).toHaveValue('')
    })
})
