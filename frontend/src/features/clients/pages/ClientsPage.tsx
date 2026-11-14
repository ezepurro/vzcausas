import { useState, type ReactNode } from 'react'
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
import { useUpdateClient } from '@/features/clients/api/useUpdateClient'
import { useDeleteClient } from '@/features/clients/api/useDeleteClient'
import type { Client, ClientFormValues } from '@/features/clients/types/client'
import type { DeleteClientFormValues } from '@/features/clients/types/clientDeletion'
import { validateClient, isValid, type ClientFormErrors } from '@/features/clients/schemas/client.schema'
import { validateDeleteClient, type DeleteClientFormErrors } from '@/features/clients/schemas/clientDeletion.schema'
import { toCreateClientBody } from '@/features/clients/utils/toCreateClientBody'
import { buildClientPatch, hasChanges } from '@/features/clients/utils/buildClientPatch'
import { toDeleteClientBody } from '@/features/clients/utils/toDeleteClientBody'
import { toFormErrors } from '@/features/clients/utils/toFormErrors'
import { formatClientName, formatDocument } from '@/features/clients/utils/clientFormat'
import { ClientsTable } from '@/features/clients/components/ClientsTable'
import { ClientFormModal } from '@/features/clients/components/ClientFormModal'
import { DeleteClientModal } from '@/features/clients/components/DeleteClientModal'
import { useDebouncedValue } from '@/shared/hooks/useDebouncedValue'
import { usePageTitle } from '@/shared/hooks/usePageTitle'

const LIMIT = 20

/**
 * Qué diálogo está abierto y sobre qué cliente: un solo estado, no varios
 * booleanos que se pueden contradecir. En la baja, `blocked` es el mensaje
 * del `409 CLIENT_HAS_ACTIVE_CASES` cuando el backend no la deja hacer.
 */
type Modal =
    | { kind: 'create' }
    | { kind: 'edit'; client: Client }
    | { kind: 'delete'; client: Client; blocked: string | null }
    | null

const EMPTY_FORM: ClientFormValues = {
    lastName: '',
    firstName: '',
    documentType: 'DNI',
    documentNumber: '',
    address: '',
    phone: '',
    email: '',
}

const EMPTY_DELETION: DeleteClientFormValues = { reason: '' }

export interface ClientsPageProps {
    /**
     * Las causas activas de un cliente, para cuando el backend no deja darlo
     * de baja (CA-11.2). La arma `cases` (`ClientActiveCases`), que este
     * módulo no puede importar: la pasa el router (`app/router/ClientsRoute`).
     * Sin ella, el diálogo muestra sólo el mensaje.
     */
    renderActiveCases?: (clientId: number) => ReactNode
}

export function ClientsPage({ renderActiveCases }: ClientsPageProps) {
    usePageTitle('Clientes')
    const toast = useToast()

    //PAGINACION Y BUSQUEDA
    const [page, setPage] = useState(1)
    const [search, setSearch] = useState('')
    const debouncedSearch = useDebouncedValue(search.trim())
    const [modal, setModal] = useState<Modal>(null)
    const [values, setValues] = useState<ClientFormValues>(EMPTY_FORM)
    const [errors, setErrors] = useState<ClientFormErrors>({})
    const [deletion, setDeletion] = useState<DeleteClientFormValues>(EMPTY_DELETION)
    const [deletionErrors, setDeletionErrors] = useState<DeleteClientFormErrors>({})

    const listParams = {
        page,
        limit:LIMIT,
        search: debouncedSearch === '' ? undefined : debouncedSearch,
    }
    const query = useClients(listParams)
    // Al apuntar a "Siguiente" se pide esa página (`usePrefetchPage`).
    const prefetchPage = usePrefetchClientsPage(listParams)
    const create = useCreateClient()
    const update = useUpdateClient()
    const remove = useDeleteClient()
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
    function openEdit(client: Client) {
        setValues({
            lastName: client.lastName,
            firstName: client.firstName,
            documentType: client.documentType,
            documentNumber: client.documentNumber,
            address: client.address,
            phone: client.phone,
            email: client.email ?? '',
        })
        setErrors({})
        setModal({kind: 'edit', client})
    }
    function openDelete(client: Client) {
        setDeletion(EMPTY_DELETION)
        setDeletionErrors({})
        setModal({kind: 'delete', client, blocked: null})
    }
    function closeModal() {
        setModal(null)
    }

    //ERRORES DEL SERVIDOR (alta y modificación)
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
        /* CA-10.11: lo dieron de baja mientras el diálogo estaba abierto. No
           hay nada que corregir: se cierra y la tabla se vuelve a pedir. */
        if (error.isNotFound) {
            toast('error', error.message)
            closeModal()
            void query.refetch()
            return
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

    //MODIFICACION DEL CLIENTE (HU10)
    function submitEdit() {
        if (modal?.kind !== 'edit') return
        const errorsFound = validateClient(values)
        setErrors(errorsFound)
        if (!isValid(errorsFound)) return

        // Un PATCH vacío es un 400 (CA-10.1): sin cambios no se llama.
        const patch = buildClientPatch(modal.client, values)
        if (!hasChanges(patch)) {
            closeModal()
            return
        }
        update.mutate({ id: modal.client.id, body: patch }, {
            onSuccess: () => {
                toast('success', 'Datos del cliente actualizados.')
                closeModal()
            },
            onError: handleApiError,
        })
    }

    //BAJA DEL CLIENTE (HU11)
    function submitDelete() {
        if (modal?.kind !== 'delete') return
        const errorsFound = validateDeleteClient(deletion)
        setDeletionErrors(errorsFound)
        if (Object.keys(errorsFound).length > 0) return

        /* El diálogo queda abierto hasta que responda: si el backend no deja
           (409), muestra por qué. La fila ya salió de la tabla y, si falla,
           vuelve (`useDeleteClient`). */
        const { client } = modal
        remove.mutate({ id: client.id, body: toDeleteClientBody(deletion) }, {
            onSuccess: () => {
                // `info` y no `success`: salió bien, pero no es un logro.
                toast('info', 'Cliente eliminado. El historial se conserva.')
                closeModal()
                // Si era la única fila de la página, no dejarlo en una página que ya no existe.
                if (rows.length === 1 && page > 1) setPage(page - 1)
            },
            onError: (error) => {
                if (!isApiError(error)) throw error
                // CA-11.2: con causas activas no procede; el diálogo muestra cuáles.
                if (error.is('CLIENT_HAS_ACTIVE_CASES')) {
                    setModal({kind: 'delete', client, blocked: error.message})
                    return
                }
                const reason = error.isValidation ? error.fieldError('reason') : undefined
                if (reason) {
                    setDeletionErrors({reason})
                    return
                }
                toast('error', error.message)
                // CA-11.9: ya no existe; la tabla se vuelve a pedir sola (`onSettled`).
                if (error.isNotFound) closeModal()
            },
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
                /* Sin datos no hay pie: mientras carga o si falló, decía "Sin
                   resultados" (H-57). */
                footer={query.isSuccess && (
                    <Pagination
                        page={pagination?.page ?? 1}
                        totalPages={pagination?.totalPages ?? 1}
                        totalItems={pagination?.totalItems ?? 0}
                        noun={['cliente', 'clientes']}
                        onChange={setPage}
                        onIntent={prefetchPage}
                    />
                )}
            >
                {query.isError ? (
                    <LoadError title="No se pudieron cargar los clientes" error={query.error} onRetry={() => void query.refetch()} retrying={query.isFetching} />
                ) : (
                    <ClientsTable
                        loading={query.isPending}
                        busy={query.isPlaceholderData}
                        rows={rows}
                        onEdit={openEdit}
                        onDelete={openDelete}
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
            {modal?.kind === 'edit' && (
                <ClientFormModal
                    mode="edit"
                    sub={`${formatClientName(modal.client)} · ${formatDocument(modal.client)}`}
                    values={values}
                    errors={errors}
                    saving={update.isPending}
                    onChange={(key, value) => setValues((s) => ({...s, [key]: value}))}
                    onConfirm={submitEdit}
                    onCancel={closeModal}
                />
            )}
            {modal?.kind === 'delete' && (
                <DeleteClientModal
                    clientName={formatClientName(modal.client)}
                    values={deletion}
                    errors={deletionErrors}
                    blocked={modal.blocked === null ? null : {
                        message: modal.blocked,
                        activeCases: renderActiveCases?.(modal.client.id),
                    }}
                    saving={remove.isPending}
                    onChange={(key, value) => setDeletion((s) => ({...s, [key]: value}))}
                    onConfirm={submitDelete}
                    onCancel={closeModal}
                />
            )}
        </>
    )
}