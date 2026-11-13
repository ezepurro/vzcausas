import { useState } from 'react'
import { isApiError } from '@/shared/api/ApiError'
import { useToast } from '@/app/providers/ToastContext'
import {
    Button,
    Icon,
    PageHeader,
    Pagination,
    Panel,
    SearchInput,
    LoadError,
} from '@/shared/components/ui'
import { useClients, usePrefetchClientsPage } from '@/features/clients/api/useClients'
import { useCreateClient } from '@/features/clients/api/useCreateClient'
import type { ClientFormValues } from '@/features/clients/types/client'
import { validateClient, isValid, type ClientFormErrors } from '@/features/clients/schemas/client.schema'
import { toCreateClientBody } from '@/features/clients/utils/toCreateClientBody'
import { toFormErrors } from '@/features/clients/utils/toFormErrors'
import { formatClientName } from '@/features/clients/utils/clientFormat'
import { ClientsTable } from '@/features/clients/components/ClientsTable'
import { ClientFormModal } from '@/features/clients/components/ClientFormModal'
import { useDebouncedValue } from '@/shared/hooks/useDebouncedValue'
import { usePageTitle } from '@/shared/hooks/usePageTitle'
const LIMIT = 20
type Modal = {kind: 'create'} | null
const EMPTY_FORM: ClientFormValues = {
    lastName: '',
    firstName: '',
    documentType: 'DNI',
    documentNumber: '',
    address: '',
    phone: '',
    email: '',
}
export function ClientsPage() {
    usePageTitle('Clientes')
    const toast = useToast()

    //PAGINACION Y BUSQUEDA
    const [page, setPage] = useState(1)
    const [search, setSearch] = useState('')
    const debouncedSearch = useDebouncedValue(search.trim())
    const [modal, setModal] = useState<Modal>(null)
    const [values, setValues] = useState<ClientFormValues>(EMPTY_FORM)
    const [errors, setErrors] = useState<ClientFormErrors>({})

    const listParams = {
        page,
        limit:LIMIT,
        search: debouncedSearch === '' ? undefined : debouncedSearch,
    }
    const query = useClients(listParams)
    // Al apuntar a "Siguiente" se pide esa página (`usePrefetchPage`).
    const prefetchPage = usePrefetchClientsPage(listParams)
    const create = useCreateClient()
    const rows = query.data?.data ?? []
    const pagination = query.data?.pagination

    //FILTROS
    function changeSearch(value:string) {
        setSearch(value)
        //Al cambiar el filtro se vuelve a la pagina 1
        setPage(1)
    }

    //MODALES
    function openCreate() {
        setValues(EMPTY_FORM)
        setErrors({})
        setModal({kind: 'create'})
    }
    function closeModal() {
        setModal(null)
    }

    //ERRORES DEL SERVIDOR
    function handleApiError(error: unknown) {
        if (!isApiError(error)) throw error

        if (error.is('CLIENT_DNI_ALREADY_EXISTS')) {
            setErrors({documentNumber: error.message})
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

    //ALTA DEL CLIENTE
    function submitCreate() {
        const errorsFound = validateClient(values)
        setErrors(errorsFound)
        if (!isValid(errorsFound)) return
        create.mutate(toCreateClientBody(values), {
            onSuccess: (client) => {
                toast('success', `Cliente ${formatClientName(client)} registrado.`)
                closeModal()
            },
            onError: handleApiError,
        })
    }

    //PANTALLA
    return (
        <>
            <PageHeader
                eyebrow="Trabajo diario"
                title="Clientes"
                sub="Las personas que representa el estudio. Registrá cada cliente una vez y elegilo en todas sus causas."
                actions={
                    <Button
                        icon={<Icon name="plus" />}
                        size="md"
                        onClick={openCreate}
                    >
                        Registrar cliente
                    </Button>
                }
            />
            <Panel 
                title="Clientes"
                actions={
                    <SearchInput
                        placeholder="Buscar por apellido o DNI"
                        aria-label="Buscar cliente"
                        value={search}
                        onChange={(e) => changeSearch(e.target.value)}
                    />
                }
                footer={
                    <Pagination
                        page={pagination?.page ?? 1}
                        totalPages={pagination?.totalPages ?? 1}
                        totalItems={pagination?.totalItems ?? 0}
                        noun={['cliente', 'clientes']}
                        onChange={setPage}
                        onIntent={prefetchPage}
                    />
                }
            >
                {query.isError ? (
                    <LoadError title="No se pudieron cargar los clientes" error={query.error} onRetry={() => void query.refetch()} retrying={query.isFetching} />
                ) : (
                    <ClientsTable
                        loading={query.isPending}
                        busy={query.isPlaceholderData}
                        rows={rows}
                        empty={
                            <div className="vz-empty">
                                <div className="vz-empty__title">Sin clientes</div>
                                <div className="vz-empty__text">
                                    No hay clientes que coincidan con la búsqueda.
                                </div>
                            </div>
                        }
                    />
                )}
            </Panel>
            {modal?.kind === 'create' && (
                <ClientFormModal
                    values = {values}
                    errors={errors}
                    saving= {create.isPending}
                    onChange={(key, value) => setValues((s) => (
                        {...s, [key]: value}
                    ))}
                    onConfirm={submitCreate}
                    onCancel={closeModal}
                />
            )} 
        </>
    )
}