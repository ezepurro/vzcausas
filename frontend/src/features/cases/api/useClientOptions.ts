import { useState } from 'react'
import type { SearchSelectOption } from '@/shared/components/forms'
import { useDebouncedValue } from '@/shared/hooks/useDebouncedValue'
import { formatClientName, formatDocument, useClient, useClients, type Client } from '@/features/clients'
import { moreResultsNote, OPTIONS_PAGE_SIZE } from '@/features/cases/utils/optionsNote'

/** "GÓMEZ, Ariel Fernando · DNI 34.812.905", como se lee en el selector. */
export function clientOptionLabel(client: Client): string {
    return `${formatClientName(client)} · ${formatDocument(client)}`
}

/**
 * Los clientes del selector de "Registrar causa".
 *
 * El listado llega de a 100 (`limit` máximo del contrato), ordenado por
 * apellido: con más clientes que eso, los últimos no estaban en el select.
 * Ahora lo que se escribe viaja como `search` y el servidor busca entre
 * todos; con el campo vacío se ven los primeros 100 y una nota avisa que hay
 * más.
 *
 * El **elegido** se pide por su id, así se muestra aunque la búsqueda actual
 * no lo traiga: uno recién registrado, uno recuperado de un borrador.
 */
export function useClientOptions(selectedId: string) {
    const [search, setSearch] = useState('')
    const debouncedSearch = useDebouncedValue(search.trim())

    const listQuery = useClients({ page: 1, limit: OPTIONS_PAGE_SIZE, search: debouncedSearch })
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
        note: moreResultsNote(listed.length, listQuery.data?.pagination.totalItems, 'clientes'),
    }
}
