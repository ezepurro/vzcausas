import { describe, expect, it } from 'vitest'
import { render, screen } from '@testing-library/react'
import { SearchInput } from '@/shared/components/ui'
import { SEARCH_MAX_LENGTH } from '@/shared/components/ui/SearchInput'

describe('SearchInput', () => {
    it(`trae un tope de ${SEARCH_MAX_LENGTH} caracteres por defecto`, () => {
        render(<SearchInput aria-label="Buscar" />)

        expect(screen.getByRole('searchbox', { name: 'Buscar' })).toHaveAttribute('maxlength', String(SEARCH_MAX_LENGTH))
    })

    it('la pantalla puede cambiar el tope', () => {
        render(<SearchInput aria-label="Buscar" maxLength={20} />)

        expect(screen.getByRole('searchbox', { name: 'Buscar' })).toHaveAttribute('maxlength', '20')
    })
})
