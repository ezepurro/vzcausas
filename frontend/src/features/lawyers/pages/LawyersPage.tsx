import { useState } from 'react'
import { useNavigate } from 'react-router'
import { isApiError } from '@/shared/api/ApiError'
import { useToast } from '@/app/providers/ToastContext'
import {
    Button,
    Icon,
    PageHeader,
    Pagination,
    Panel,
    SearchInput,
    Tabs,
} from '@/shared/components/ui'
import { useLawyers } from '@/features/lawyers/api/useLawyers'
import { useCreateLawyer } from '@/features/lawyers/api/useCreateLawyer'
import type { LawyerFormValues } from '@/features/lawyers/types/lawyer'
import { validateLawyer, isValid, type LawyerFormErrors } from '@/features/lawyers/schemas/lawyer.schema'
import { toCreateLawyerBody } from '@/features/lawyers/utils/toCreateLawyerBody'
import { LawyersTable } from '@/features/lawyers/components/LawyersTable'
import { LawyerFormModal } from '@/features/lawyers/components/LawyerFormModal'

const LIMIT = 20

/**
 * Usuarios y abogados son dos pantallas con dos rutas, pero el prototipo las
 * muestra como pestañas de una sola sección. Cada pestaña navega a su ruta:
 * así el rail y la pestaña llevan a la misma URL y un F5 no te cambia de lugar.
 */
type AdminTab = '/usuarios' | '/abogados'

const ADMIN_TABS: { id: AdminTab; label: string }[] = [
    { id: '/usuarios', label: 'Usuarios' },
    { id: '/abogados', label: 'Abogados' },
]

/**
 * Qué modal está abierto: UN estado. Hoy sólo existe el alta; la
 * modificación y la baja se suman acá como `{ kind: 'edit'; lawyer }`.
 */
type Modal = { kind: 'create' } | null

const EMPTY_FORM: LawyerFormValues = {
    fullName: '',
    registrationNumber: '',
}

export function LawyersPage() {
    const toast = useToast()
    const navigate = useNavigate()

    /* Paginado y búsqueda viven acá y se pasan al hook: van en la clave de caché. */
    const [page, setPage] = useState(1)
    const [search, setSearch] = useState('')
    const [modal, setModal] = useState<Modal>(null)
    const [values, setValues] = useState<LawyerFormValues>(EMPTY_FORM)
    const [errors, setErrors] = useState<LawyerFormErrors>({})

    const query = useLawyers({
        page,
        limit: LIMIT,
        search: search.trim() === '' ? undefined : search.trim(),
    })
    const create = useCreateLawyer()

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

        if (error.isValidation && error.hasFieldErrors) {
            setErrors(error.details as LawyerFormErrors)
            return
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
                    `Abogado ${lawyer.fullName} registrado con matrícula ${lawyer.registrationNumber}.`,
                )
                closeModal()
            },
            onError: handleApiError,
        })
    }

    /* ---------------- pantalla ---------------- */

    return (
        <>
            <PageHeader
                eyebrow="Administración"
                title="Usuarios y abogados"
                sub="Desde esta sección podés administrar el equipo del estudio. Consultá el listado de abogados, sus matrículas y la cantidad de causas activas a su cargo."
                actions={
                    <Button icon={<Icon name="plus" />} size="md" onClick={openCreate}>
                        Registrar abogado
                    </Button>
                }
            />

            <Tabs tabs={ADMIN_TABS} active="/abogados" onChange={(route) => navigate(route)} />

            <Panel
                title="Abogados"
                actions={
                    <SearchInput
                        placeholder="Buscar por nombre o matrícula"
                        aria-label="Buscar abogado"
                        value={search}
                        onChange={(e) => changeSearch(e.target.value)}
                    />
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
                {query.isPending ? (
                    <div className="vz-empty">
                        <div className="vz-empty__title">Cargando abogados…</div>
                    </div>
                ) : query.isError ? (
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
                        rows={rows}
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

            {modal?.kind === 'create' && (
                <LawyerFormModal
                    values={values}
                    errors={errors}
                    saving={create.isPending}
                    onChange={(k, v) => setValues((s) => ({ ...s, [k]: v }))}
                    onConfirm={submitCreate}
                    onCancel={closeModal}
                />
            )}
        </>
    )
}
