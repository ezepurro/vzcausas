import { useState } from 'react'
import { describe, expect, it, vi } from 'vitest'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { Combobox, type ComboboxOption } from '@/shared/components/forms'

/**
 * Es presentacional: la pantalla guarda el texto y decide qué opciones
 * mostrar. El `Harness` hace de pantalla, con las opciones fijas.
 */

const OPTIONS: ComboboxOption[] = [
    { value: '1', label: 'Alegato', description: '10 días hábiles' },
    { value: '2', label: 'Apelación' },
    { value: '3', label: 'Sentencia' },
]

function Harness(props: {
    options?: ComboboxOption[]
    emptyText?: string
    disabled?: boolean
    initial?: string
    onSelect?: (option: ComboboxOption) => void
    onSubmit?: () => void
    onParentKeyDown?: () => void
}) {
    const [value, setValue] = useState(props.initial ?? '')
    return (
        <div onKeyDown={props.onParentKeyDown}>
            <form
                onSubmit={(e) => {
                    e.preventDefault()
                    props.onSubmit?.()
                }}
            >
                <label htmlFor="state">Estado</label>
                <Combobox
                    id="state"
                    value={value}
                    onChange={setValue}
                    onSelect={(option) => {
                        setValue(option.label)
                        props.onSelect?.(option)
                    }}
                    options={props.options ?? OPTIONS}
                    emptyText={props.emptyText}
                    disabled={props.disabled}
                />
            </form>
        </div>
    )
}

const input = () => screen.getByRole('combobox', { name: 'Estado' })

describe('Combobox', () => {
    it('con el teclado: las flechas recorren, Enter elige y no envía el formulario', async () => {
        const onSelect = vi.fn()
        const onSubmit = vi.fn()
        const user = userEvent.setup()
        render(<Harness onSelect={onSelect} onSubmit={onSubmit} />)

        await user.click(input())
        await user.keyboard('{ArrowDown}{ArrowDown}')
        expect(input()).toHaveAttribute('aria-activedescendant', screen.getAllByRole('option')[1].id)

        await user.keyboard('{Enter}')

        expect(onSelect).toHaveBeenCalledWith(OPTIONS[1])
        expect(onSubmit).not.toHaveBeenCalled()
    })
})
