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
} from '@/shared/components/ui'
import { Select, type SelectOption } from '@/shared/components/forms'
import { useLawyers } from '@/features/lawyers'
import { useUsers } from '@/features/users/api/useUsers'
import { useCreateUser } from '@/features/users/api/useCreateUser'
import { useUpdateUser } from '@/features/users/api/useUpdateUser'
import { useDeleteUser } from '@/features/users/api/useDeleteUser'
import {
    LAWYER_MODES,
    ROLES,
    type Role,
    type User,
    type UserFormValues,
} from '@/features/users/types/user'
import { validateUser, type UserFormErrors } from '@/features/users/schemas/user.schema'
import { toCreateUserBody } from '@/features/users/utils/toCreateUserBody'
import { buildUserPatch, hasChanges } from '@/features/users/utils/buildUserPatch'
import { lawyerOptionLabel } from '@/features/users/utils/lawyerLink'
import { ROLE_LABELS, roleChecks, rolesFromValues } from '@/features/users/utils/roles'
import { UsersTable } from '@/features/users/components/UsersTable'
import { UserFormModal } from '@/features/users/components/UserFormModal'
import { DeleteUserModal } from '@/features/users/components/DeleteUserModal'
import { useDebouncedValue } from '@/shared/hooks/useDebouncedValue'
const LIMIT = 20

/** El "sin filtro" del select de perfil. Cadena vacía, que es lo que no viaja. */
const ALL_ROLES = ''

const ROLE_FILTER: SelectOption[] = [
    { value: ALL_ROLES, label: 'Todos los perfiles' },
    ...ROLES.map((r) => ({ value: r, label: ROLE_LABELS[r] })),
]

/**
 * Qué modal está abierto y con qué registro: UN estado
 */
type Modal =
    | { kind: 'create' }
    | { kind: 'edit'; user: User }
    | { kind: 'delete'; user: User }
    | null

const EMPTY_FORM: UserFormValues = {
    fullName: '',
    username: '',
    email: '',
    password: '',
    passwordConfirm: '',
    ...roleChecks(['LAWYER']),
    lawyerMode: LAWYER_MODES.link,
    lawyerId: '',
    lawyerFullName: '',
    registrationNumber: '',
}

export function UsersPage() {
    const toast = useToast()

    /* Filtros y paginado viven acá y se le pasan al hook: `DataTable` no
       pagina ni filtra, y los parámetros tienen que estar en la clave de caché. */
    const [page, setPage] = useState(1)
    const [search, setSearch] = useState('')
    const debouncedSearch = useDebouncedValue(search.trim())
    const [role, setRole] = useState<Role | typeof ALL_ROLES>(ALL_ROLES)
    const [modal, setModal] = useState<Modal>(null)
    const [values, setValues] = useState<UserFormValues>(EMPTY_FORM)
    const [errors, setErrors] = useState<UserFormErrors>({})

    const query = useUsers({
        page,
        limit: LIMIT,
        search: debouncedSearch === '' ? undefined : debouncedSearch,
        role: role === ALL_ROLES ? undefined : role,
    })

    /* Las fichas para el select del formulario. Se piden siempre y no sólo
        con el modal abierto porque son pocas y quedan cacheadas: abrir el alta
       no tiene que esperar una consulta. */
    const lawyers = useLawyers({ limit: 100 })

    const create = useCreateUser()
    const update = useUpdateUser()
    const remove = useDeleteUser()

    const rows = query.data?.data ?? []
    const pagination = query.data?.pagination
    const saving = create.isPending || update.isPending || remove.isPending

    const lawyerOptions: SelectOption[] = (lawyers.data?.data ?? []).map((l) => ({
        value: String(l.id),
        label: lawyerOptionLabel(l),
    }))

    /* ---------------- filtros ---------------- */

    function changeSearch(value: string) {
        setSearch(value)
        // Al cambiar un filtro se vuelve a la primera página: si no, se puede
        // quedar parado en la página 3 de un resultado que ahora tiene una.
        setPage(1)
    }

    function changeRole(value: string) {
        setRole(value as Role | typeof ALL_ROLES)
        setPage(1)
    }

    /* ---------------- modales ---------------- */

    function openCreate() {
        setValues(EMPTY_FORM)
        setErrors({})
        setModal({ kind: 'create' })
    }

    function openEdit(user: User) {
        setValues({
            fullName: user.fullName,
            username: user.username,
            email: user.email,
            password: '',
            passwordConfirm: '',
            ...roleChecks(user.roles),
            lawyerMode: LAWYER_MODES.link,
            lawyerId: user.lawyer ? String(user.lawyer.id) : '',
            lawyerFullName: '',
            registrationNumber: '',
        })
        setErrors({})
        setModal({ kind: 'edit', user })
    }

    function closeModal() {
        setModal(null)
    }

    /* ---------------- errores del servidor ---------------- */

    /**
     * Los errores llegan siempre como `ApiError`. Se ramifica por código y por
     * los getters, nunca comparando `e.message`, y para mostrar se usa
     * `e.message`, que ya viene en castellano.
     */
    function handleApiError(error: unknown) {
        if (!isApiError(error)) throw error

        // Son 409, pero cada uno es el problema de UN campo: van en el campo,
        // no en un aviso suelto.
        if (error.is('USERNAME_ALREADY_EXISTS')) {
            setErrors({ username: error.message })
            return
        }

        if (error.is('EMAIL_ALREADY_EXISTS')) {
            setErrors({ email: error.message })
            return
        }

        // El abogado elegido ya tiene una cuenta activa: es del select de fichas.
        if (error.is('LAWYER_ALREADY_LINKED')) {
            setErrors({ lawyerId: error.message })
            return
        }

        if (error.is('LAWYER_REGISTRATION_ALREADY_EXISTS')) {
            setErrors({ registrationNumber: error.message })
            return
        }

        if (error.isValidation && error.hasFieldErrors) {
            setErrors(error.details as UserFormErrors)
            return
        }

        toast('error', error.message)
    }
    /**
     * Los roles con los que el usuario va a quedar si se guarda.
     *
     * Son los tildes del formulario y nada más: como el formulario expresa
     * los tres perfiles, lo que se ve es lo que se manda. De esto depende si
     * hace falta ficha, así que se calcula una vez y lo usan el formulario,
     * el schema y el parche.
     */
    const nextRoles = rolesFromValues(values)
    /* ---------------- alta y edición ---------------- */

    function submitForm() {
        if (modal?.kind !== 'create' && modal?.kind !== 'edit') return

        const mode = modal.kind
        const found = validateUser(values, { mode, roles: nextRoles })
        setErrors(found)
        if (Object.keys(found).length > 0) return
        if (mode === 'create') {
            create.mutate(toCreateUserBody(values, nextRoles), {
                onSuccess: (user) => {
                    toast('success', `Usuario ${user.username} registrado.`)
                    closeModal()
                },
                onError: handleApiError,
            })
            return
        }

        const patch = buildUserPatch(modal.user, values, nextRoles)

        // El contrato responde 400 a un PATCH vacío, así que si no cambió
        // nada ni se manda: se cierra y listo.
        if (!hasChanges(patch)) {
            closeModal()
            return
        }

        update.mutate(
            { id: modal.user.id, body: patch },
            {
                onSuccess: (user) => {
                    toast('success', `Usuario ${user.username} actualizado.`)
                    closeModal()
                },
                onError: handleApiError,
            },
        )
    }

    /* ---------------- baja ---------------- */

    function confirmDelete() {
        if (modal?.kind !== 'delete') return
        const { user } = modal

        remove.mutate(user.id, {
            onSuccess: () => {
                // `info` y no `success`: salió bien, pero no es un logro.
                toast('info', `${user.fullName} Eliminado correctamente.`)
                closeModal()
                // Si era la única fila de la página, no dejar al usuario en
                // una página que ya no existe.
                if (rows.length === 1 && page > 1) setPage(page - 1)
            },
            onError: (error) => {
                // Acá no hay campos que marcar: el 409 de dependencias es del
                // registro entero.
                if (isApiError(error)) toast('error', error.message)
                closeModal()
            },
        })
    }

    /* ---------------- pantalla ---------------- */

    return (
        <>
            <PageHeader
                eyebrow="Administración"
                title="Usuarios"
                sub="Desde esta sección podés administrar los ingresos al sistema. Consultá el registro de usuarios, sus niveles de permiso y el historial de conexiones del estudio."
                actions={
                    <Button icon={<Icon name="plus" />} size="md" onClick={openCreate}>
                        Registrar usuario
                    </Button>
                }
            />

            <Panel
                title="Usuarios"
                actions={
                    <>
                        <SearchInput
                            placeholder="Buscar usuario"
                            aria-label="Buscar usuario"
                            value={search}
                            onChange={(e) => changeSearch(e.target.value)}
                        />
                        <Select
                            aria-label="Filtrar por perfil"
                            options={ROLE_FILTER}
                            value={role}
                            onChange={(e) => changeRole(e.target.value)}
                        />
                    </>
                }
                footer={
                    <Pagination
                        page={pagination?.page ?? 1}
                        totalPages={pagination?.totalPages ?? 1}
                        totalItems={pagination?.totalItems ?? 0}
                        noun={['usuario', 'usuarios']}
                        onChange={setPage}
                    />
                }
            >
                {query.isPending ? (
                    <div className="vz-empty">
                        <div className="vz-empty__title">Cargando usuarios…</div>
                    </div>
                ) : query.isError ? (
                    <div className="vz-empty">
                        <div className="vz-empty__title">No se pudieron cargar los usuarios</div>
                        <div className="vz-empty__text">
                            {isApiError(query.error)
                                ? query.error.message
                                : 'Ocurrió un error inesperado.'}
                        </div>
                    </div>
                ) : (
                    <UsersTable
                        rows={rows}
                        onEdit={openEdit}
                        onDelete={(user) => setModal({ kind: 'delete', user })}
                        empty={
                            <div className="vz-empty">
                                <div className="vz-empty__title">Sin usuarios</div>
                                <div className="vz-empty__text">
                                    No hay usuarios que coincidan con la búsqueda o los filtros
                                    elegidos.
                                </div>
                            </div>
                        }
                    />
                )}
            </Panel>

            {(modal?.kind === 'create' || modal?.kind === 'edit') && (
                <UserFormModal
                    mode={modal.kind}
                    roles={nextRoles}
                    sub={
                        modal.kind === 'edit'
                            ? `${modal.user.fullName} · ${modal.user.username}`
                            : ""
                    }
                    values={values}
                    errors={errors}
                    lawyerOptions={lawyerOptions}
                    saving={saving}
                    onChange={(k, v) => setValues((s) => ({ ...s, [k]: v }))}
                    onConfirm={submitForm}
                    onCancel={closeModal}
                />
            )}

            {modal?.kind === 'delete' && (
                <DeleteUserModal
                    user={modal.user}
                    saving={saving}
                    onConfirm={confirmDelete}
                    onCancel={closeModal}
                />
            )}
        </>
    )
}
