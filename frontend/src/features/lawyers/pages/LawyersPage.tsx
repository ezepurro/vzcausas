import { useState } from 'react'
import { isApiError } from '@/shared/api/ApiError'
import { useToast } from '@/app/providers/ToastContext'
import { useCan } from '@/app/access/useCan'
import {
    Button,
    Icon,
    PageHeader,
    Pagination,
    Panel,
    SearchInput,
} from '@/shared/components/ui'
import { useLawyers } from '@/features/lawyers/api/useLawyers'
import { useCreateLawyer } from '@/features/lawyers/api/useCreateLawyer'
import { useUpdateLawyer } from '@/features/lawyers/api/useUpdateLawyer'
import type { Lawyer, LawyerFormValues } from '@/features/lawyers/types/lawyer'
import { validateLawyer, isValid, type LawyerFormErrors } from '@/features/lawyers/schemas/lawyer.schema'
import { toCreateLawyerBody } from '@/features/lawyers/utils/toCreateLawyerBody'
import { buildLawyerPatch, hasChanges } from '@/features/lawyers/utils/buildLawyerPatch'
import { toFormErrors } from '@/features/lawyers/utils/toFormErrors'
import { LawyersTable } from '@/features/lawyers/components/LawyersTable'
import { LawyerFormModal } from '@/features/lawyers/components/LawyerFormModal'
import { useDebouncedValue } from '@/shared/hooks/useDebouncedValue'
import { formatPersonName } from '@/shared/lib/personName'
const LIMIT = 20

/**
 * Qué modal está abierto: UN estado. La edición lleva el abogado que se abrió,
 * contra el que se arma el parche. La baja (HU15) no está en el contrato.
 */
type Modal = { kind: 'create' } | { kind: 'edit'; lawyer: Lawyer } | null

const EMPTY_FORM: LawyerFormValues = {
    lastName: '',
    firstName: '',
    registrationNumber: '',
}

export function LawyersPage() {
    const canCreate = useCan('lawyers.create')
    const canEdit = useCan('lawyers.update')
    const toast = useToast()

    /* Paginado y búsqueda viven acá y se pasan al hook: van en la clave de caché. */
    const [page, setPage] = useState(1)
    const [search, setSearch] = useState('')
    const [modal, setModal] = useState<Modal>(null)
    const [values, setValues] = useState<LawyerFormValues>(EMPTY_FORM)
    const [errors, setErrors] = useState<LawyerFormErrors>({})

    const debouncedSearch = useDebouncedValue(search.trim())
    const query = useLawyers({
        page,
        limit: LIMIT,
        search: debouncedSearch === '' ? undefined : debouncedSearch,
    })
    const create = useCreateLawyer()
    const update = useUpdateLawyer()

    const rows = query.data?.data ?? []
    const pagination = query.data?.pagination

    /* ---------------- filtros ---------------- */

    function changeSearch(value: string) {
        setSearch(value)
        // Al cambiar el filtro se vuelve a la primera página.
        setPage(1)
    }

    /* ---------------- modales ---------------- */

    function openCreate() {
        setValues(EMPTY_FORM)
        setErrors({})
        setModal({ kind: 'create' })
    }

    function openEdit(lawyer: Lawyer) {
        setValues({
            lastName: lawyer.lastName,
            firstName: lawyer.firstName,
            registrationNumber: lawyer.registrationNumber,
        })
        setErrors({})
        setModal({ kind: 'edit', lawyer })
    }

    function closeModal() {
        setModal(null)
    }

    /* ---------------- errores del servidor ---------------- */

    function handleApiError(error: unknown) {
        if (!isApiError(error)) throw error

        // Es un 409, pero el problema es de UN campo: va en el campo.
        if (error.is('LAWYER_REGISTRATION_ALREADY_EXISTS')) {
            setErrors({ registrationNumber: error.message })
            return
        }

        if (error.isValidation) {
            const fieldErrors = toFormErrors(error.details)
            if (!isValid(fieldErrors)) {
                setErrors(fieldErrors)
                return
            }
            // Un 400 sin ningún campo que marcar no puede quedar mudo.
        }

        toast('error', error.message)
    }

    /* ---------------- alta ---------------- */

    function submitCreate() {
        const found = validateLawyer(values)
        setErrors(found)
        if (!isValid(found)) return

        create.mutate(toCreateLawyerBody(values), {
            onSuccess: (lawyer) => {
                toast(
                    'success',
                    `Abogado ${formatPersonName(lawyer)} registrado con matrícula ${lawyer.registrationNumber}.`,
                )
                closeModal()
            },
            onError: handleApiError,
        })
    }

    /* ---------------- edición ---------------- */

    function submitEdit(lawyer: Lawyer) {
        const found = validateLawyer(values)
        setErrors(found)
        if (!isValid(found)) return

        const patch = buildLawyerPatch(lawyer, values)

        // El contrato responde 400 a un PATCH vacío (CA-14.10), así que si no
        // cambió nada ni se manda: se cierra y listo.
        if (!hasChanges(patch)) {
            closeModal()
            return
        }

        update.mutate(
            { id: lawyer.id, body: patch },
            {
                onSuccess: (updated) => {
                    toast('success', `Datos de ${formatPersonName(updated)} actualizados.`)
                    closeModal()
                },
                onError: handleApiError,
            },
        )
    }

    /* ---------------- pantalla ---------------- */

    return (
        <>
            <PageHeader
                eyebrow="Administración"
                title="Abogados"
                sub="Desde esta sección podés administrar el equipo del estudio. Consultá el listado de abogados, sus matrículas y la cantidad de causas activas a su cargo."
            />

            <Panel
                title="Abogados"
                actions={
                    <>
                        <SearchInput
                            placeholder="Buscar por apellido o matrícula"
                            aria-label="Buscar abogado"
                            value={search}
                            onChange={(e) => changeSearch(e.target.value)}
                        />
                        <Button
                            icon={<Icon name="plus" />}
                            size="md"
                            disabled={!canCreate}
                            title={canCreate ? undefined : 'Sólo el Administrador puede registrar abogados.'}
                            onClick={openCreate}
                        >
                            Registrar abogado
                        </Button>
                    </>
                }
                footer={
                    <Pagination
                        page={pagination?.page ?? 1}
                        totalPages={pagination?.totalPages ?? 1}
                        totalItems={pagination?.totalItems ?? 0}
                        noun={['abogado', 'abogados']}
                        onChange={setPage}
                    />
                }
            >
                {query.isError ? (
                    <div className="vz-empty">
                        <div className="vz-empty__title">No se pudieron cargar los abogados</div>
                        <div className="vz-empty__text">
                            {isApiError(query.error)
                                ? query.error.message
                                : 'Ocurrió un error inesperado.'}
                        </div>
                    </div>
                ) : (
                    <LawyersTable
                        loading={query.isPending}
                        busy={query.isPlaceholderData}
                        rows={rows}
                        onEdit={openEdit}
                        canEdit={canEdit}
                        empty={
                            <div className="vz-empty">
                                <div className="vz-empty__title">Sin abogados</div>
                                <div className="vz-empty__text">
                                    No hay abogados que coincidan con la búsqueda.
                                </div>
                            </div>
                        }
                    />
                )}
            </Panel>

            {modal !== null && (
                <LawyerFormModal
                    mode={modal.kind}
                    sub={
                        modal.kind === 'edit'
                            ? `${formatPersonName(modal.lawyer)} · matrícula ${modal.lawyer.registrationNumber}`
                            : undefined
                    }
                    values={values}
                    errors={errors}
                    saving={modal.kind === 'create' ? create.isPending : update.isPending}
                    onChange={(k, v) => setValues((s) => ({ ...s, [k]: v }))}
                    onConfirm={modal.kind === 'create' ? submitCreate : () => submitEdit(modal.lawyer)}
                    onCancel={closeModal}
                />
            )}
        </>
    )
}
