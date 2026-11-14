import { useState } from 'react'
import type { SearchSelectOption } from '@/shared/components/forms'
import { useDebouncedValue } from '@/shared/hooks/useDebouncedValue'
import { formatClientName, formatDocument, useClient, useClients, type Client } from '@/features/clients'
import { hasMorePages, moreResultsNote, OPTIONS_PAGE_SIZE } from '@/features/cases/utils/optionsNote'

/** "GÓMEZ, Ariel Fernando · DNI 34.812.905", como se lee en el selector. */
export function clientOptionLabel(client: Client): string {
    return `${formatClientName(client)} · ${formatDocument(client)}`
}

/**
 * Los clientes del selector de "Registrar causa".
 *
 * El listado llega de a 100 (`limit` máximo del contrato), ordenado por
 * apellido: con más clientes que eso, los últimos no estaban en el select.
 * Ahora, cuando hay más de una página, lo que se escribe viaja como `search`
 * y el servidor busca entre todos; con el campo vacío se ven los primeros 100
 * y una nota avisa que hay más.
 *
 * El **elegido** se pide por su id, así se muestra aunque la búsqueda actual
 * no lo traiga: uno recién registrado, uno recuperado de un borrador.
 */
export function useClientOptions(selectedId: string) {
    const [search, setSearch] = useState('')
    const debouncedSearch = useDebouncedValue(search.trim())

    /* La primera página, sin filtro. Si ahí están todos, lo escrito se filtra
       en el selector (que no distingue acentos ni exige el texto exacto) y no
       hace falta molestar al servidor. Sólo con más clientes que una página
       lo escrito viaja como `search`. */
    const firstPage = useClients({ page: 1, limit: OPTIONS_PAGE_SIZE, search: '' })
    const remote = debouncedSearch !== '' && hasMorePages(firstPage.data)
    const listQuery = useClients({ page: 1, limit: OPTIONS_PAGE_SIZE, search: remote ? debouncedSearch : '' })
    const listed = listQuery.data?.data ?? []

    const id = selectedId === '' ? null : Number(selectedId)
    const selectedQuery = useClient(id)
    /* Mientras llega el detalle, el del listado alcanza: evita un parpadeo. */
    const selected = selectedQuery.data ?? listed.find((c) => c.id === id) ?? null

    const options: SearchSelectOption[] = listed.map((c) => ({ value: String(c.id), label: clientOptionLabel(c) }))

    return {
        options,
        selected,
        onSearch: setSearch,
        loading: listQuery.isFetching,
        /** La lista no se pudo cargar: el selector lo dice en lugar de "Ningún cliente coincide.". */
        failed: listQuery.isError,
        note: moreResultsNote(listed.length, listQuery.data?.pagination.totalItems, 'clientes'),
    }
}
