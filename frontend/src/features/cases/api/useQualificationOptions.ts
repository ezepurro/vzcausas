import { useState } from 'react'
import type { SearchSelectOption } from '@/shared/components/forms'
import { useDebouncedValue } from '@/shared/hooks/useDebouncedValue'
import {
    formatPrescription,
    useLegalQualifications,
    useLegalQualificationsByIds,
    type LegalQualification,
} from '@/features/legal-params'
import { hasMorePages, moreResultsNote, OPTIONS_PAGE_SIZE } from '@/features/cases/utils/optionsNote'

/**
 * Lo que se sabe de una calificación elegida: `found` con sus datos,
 * `missing` si el servidor ya no la tiene (se dio de baja) o `pending`
 * mientras no llega la respuesta.
 */
export type QualificationLookup =
    | { status: 'found'; qualification: Pick<LegalQualification, 'id' | 'name' | 'prescriptionMonths'> }
    | { status: 'missing' }
    | { status: 'pending' }

/**
 * Las calificaciones legales del selector de "Registrar causa" y de
 * "Modificar causa".
 *
 * - **Las que se pueden agregar** salen del listado. Con más de una página,
 *   lo escrito viaja como `search` y el servidor busca entre todas, no sólo
 *   entre las primeras 100.
 * - **Las elegidas** (`chosenIds`) se resuelven una por una por su id. Antes
 *   se buscaban en el listado, y una que no entraba en sus 100 —por ejemplo
 *   una recién registrada— se mostraba como "dada de baja" y bloqueaba el
 *   alta. Ahora "dada de baja" es el `404` de su consulta.
 */
export function useQualificationOptions(chosenIds: number[]) {
    const [search, setSearch] = useState('')
    const debouncedSearch = useDebouncedValue(search.trim())

    /* Como en `useClientOptions`: mientras todas entren en la primera página,
       lo escrito se filtra en el selector y no viaja. */
    const firstPage = useLegalQualifications({ page: 1, limit: OPTIONS_PAGE_SIZE, search: '' })
    const remote = debouncedSearch !== '' && hasMorePages(firstPage.data)
    const listQuery = useLegalQualifications({ page: 1, limit: OPTIONS_PAGE_SIZE, search: remote ? debouncedSearch : '' })
    const listed = listQuery.data?.data ?? []
    const lookups = useLegalQualificationsByIds(chosenIds)

    const chosen = new Set(chosenIds)
    const options: SearchSelectOption[] = listed
        .filter((q) => !chosen.has(q.id))
        .map((q) => ({ value: String(q.id), label: `${q.name} · ${formatPrescription(q.prescriptionMonths)}` }))

    function lookup(id: number): QualificationLookup {
        const found = lookups.find((item) => item.id === id)
        /* Mientras llega el detalle, la del listado alcanza: recién elegida
           está ahí, y así la fila aparece sin esperar. */
        const qualification = found?.qualification ?? listed.find((q) => q.id === id)
        if (qualification) return { status: 'found', qualification }
        return found?.missing ? { status: 'missing' } : { status: 'pending' }
    }

    return {
        options,
        lookup,
        onSearch: setSearch,
        loading: listQuery.isFetching,
        note: moreResultsNote(listed.length, listQuery.data?.pagination.totalItems, 'calificaciones'),
    }
}
