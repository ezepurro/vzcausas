import { useState } from 'react';
import { isApiError } from '@/shared/api/ApiError';
import { useToast } from '@/app/providers/ToastContext';
import { Button, Icon, PageHeader, Panel, SearchInput, Tabs} from '@/shared/components/ui';
import { useProceduralStates } from '@/features/legal-params/api/useProceduralStates';
import { useCreateProceduralState } from '@/features/legal-params/api/useCreateProceduralState';
import { useUpdateProceduralState } from '@/features/legal-params/api/useUpdateProceduralState';
import { useDeleteProceduralState } from '@/features/legal-params/api/useDeleteProceduralState';
import {
    DAY_TYPES,
    JURISDICTIONS,
    type Jurisdiction,
    type ProceduralState,
    type ProceduralStateFormValues,
} from '@/features/legal-params/types/proceduralState';
import {
    validateProceduralState,
    type ProceduralStateErrors,
} from '@/features/legal-params/schemas/proceduralState.schema';
import { toCreateProceduralStateBody } from '@/features/legal-params/utils/toCreateProceduralStateBody';
import {
    buildProceduralStatePatch,
    isEmptyPatch,
} from '@/features/legal-params/utils/buildProceduralStatePatch';
import { ProceduralStatesTable } from '@/features/legal-params/components/ProceduralStatesTable';
import { ProceduralStateFormModal } from '@/features/legal-params/components/ProceduralStateFormModal';
import { DeleteProceduralStateModal } from '@/features/legal-params/components/DeleteProceduralStateModal';
import { Pagination } from '@/features/legal-params/components/Pagination';

const LIMIT = 20;

/**
 * Fuero activo en las lengüetas. `'ALL'` es el "sin filtro".
 *
 * Es un código y no un texto de pantalla porque `Tabs` separa el `id` de la
 * `label`: el id viaja por el código y la etiqueta es lo único que se lee.
 * (El `Select` de antes obligaba a usar el propio texto como valor, por eso
 * el centinela era una cadena de interfaz.)
 */
type JurisdictionTab = Jurisdiction | 'ALL';

const JURISDICTION_TABS: { id: JurisdictionTab; label: string }[] = [
    { id: 'ALL', label: 'Todos' },
    ...JURISDICTIONS.map((j) => ({ id: j, label: j })),
];


/**
 * Qué modal está abierto y con qué registro: UN estado, no tres booleanos
 * que se pueden contradecir entre sí.
 */
type Modal =
    | { kind: 'create' }
    | { kind: 'edit'; state: ProceduralState }
    | { kind: 'delete'; state: ProceduralState }
    | null;

const EMPTY_FORM: ProceduralStateFormValues = {
    name: '',
    jurisdiction: JURISDICTIONS[0],
    proceduralTimeLimit: '',
    dayType: DAY_TYPES[0],
};

export function ProceduralStatesPage() {
    const toast = useToast();

    /* Filtros y paginado viven acá y se le pasan al hook: `DataTable` no
       pagina ni filtra, y los parámetros tienen que estar en la clave de caché. */
    const [page, setPage] = useState(1);
    const [search, setSearch] = useState('');
    const [jurisdiction, setJurisdiction] = useState<JurisdictionTab>('ALL');

    const [modal, setModal] = useState<Modal>(null);
    const [values, setValues] = useState<ProceduralStateFormValues>(EMPTY_FORM);
    const [errors, setErrors] = useState<ProceduralStateErrors>({});

    const query = useProceduralStates({
        page,
        limit: LIMIT,
        search: search.trim() === '' ? undefined : search.trim(),
        jurisdiction: jurisdiction === 'ALL' ? undefined : jurisdiction,
    });


    const create = useCreateProceduralState();
    const update = useUpdateProceduralState();
    const remove = useDeleteProceduralState();

    const rows = query.data?.data ?? [];
    const pagination = query.data?.pagination;
    const saving = create.isPending || update.isPending || remove.isPending;

    /* ---------------- filtros ---------------- */

    function changeSearch(value: string) {
        setSearch(value);
        // Al cambiar un filtro se vuelve a la primera página: si no, se puede
        // quedar parado en la página 3 de un resultado que ahora tiene una.
        setPage(1);
    }

    function changeJurisdiction(value: JurisdictionTab) {
        setJurisdiction(value);
        setPage(1);
    }


    /* ---------------- modales ---------------- */

    function openCreate() {
        setValues(EMPTY_FORM);
        setErrors({});
        setModal({ kind: 'create' });
    }

    function openEdit(state: ProceduralState) {
        setValues({
            name: state.name,
            jurisdiction: state.jurisdiction,
            proceduralTimeLimit: state.proceduralTimeLimit,
            dayType: state.dayType,
        });
        setErrors({});
        setModal({ kind: 'edit', state });
    }

    function closeModal() {
        setModal(null);
    }

    /* ---------------- errores del servidor ---------------- */

    /**
     * Los errores llegan siempre como `ApiError`. Se ramifica por código y por
     * los getters, nunca comparando `e.message`, y para mostrar se usa
     * `e.message`, que ya viene en castellano.
     */
    function handleApiError(error: unknown) {
        if (!isApiError(error)) throw error;

        // Es un 409, pero es el problema de UN campo: va en el campo, no en
        // un aviso suelto.
        if (error.is('PROCEDURAL_STATE_ALREADY_EXISTS')) {
            setErrors({ name: error.message });
            return;
        }

        if (error.isValidation && error.hasFieldErrors) {
            setErrors(error.details as ProceduralStateErrors);
            return;
        }

        toast('error', error.message);
    }

    /* ---------------- alta y edición ---------------- */

    function submitForm() {
        const found = validateProceduralState(values);
        setErrors(found);
        if (Object.keys(found).length > 0) return;

        if (modal?.kind === 'create') {
            create.mutate(toCreateProceduralStateBody(values), {
                onSuccess: (state) => {
                    toast('success', `Estado "${state.name}" agregado al fuero ${state.jurisdiction}.`);
                    closeModal();
                },
                onError: handleApiError,
            });
            return;
        }

        if (modal?.kind === 'edit') {
            const patch = buildProceduralStatePatch(modal.state, values);

            // El contrato responde 400 a un PATCH vacío, así que si no cambió
            // nada ni se manda: se cierra y listo.
            if (isEmptyPatch(patch)) {
                closeModal();
                return;
            }

            update.mutate(
                { id: modal.state.id, body: patch },
                {
                    onSuccess: (state) => {
                        toast('success', `Estado "${state.name}" actualizado.`);
                        closeModal();
                    },
                    onError: handleApiError,
                },
            );
        }
    }

    /* ---------------- baja ---------------- */

    function confirmDelete() {
        if (modal?.kind !== 'delete') return;
        const { state } = modal;

        remove.mutate(state.id, {
            onSuccess: () => {
                // `info` y no `success`: salió bien, pero no es un logro.
                toast('info', `Estado "${state.name}" eliminado del fuero ${state.jurisdiction}.`);
                closeModal();
                // Si era la única fila de la página, no dejar al usuario en una
                // página que ya no existe.
                if (rows.length === 1 && page > 1) setPage(page - 1);
            },
            onError: (error) => {
                // Acá no hay campos que marcar: el 409 de dependencias es del
                // registro entero.
                if (isApiError(error)) toast('error', error.message);
                closeModal();
            },
        });
    }

    /* ---------------- pantalla ---------------- */

    return (
        <>
            <PageHeader
                eyebrow="Administración"
                title="Estados y plazos"
                sub="Esta tabla gobierna el cómputo de plazos del sistema. El ciclo de vida de cada fuero es una secuencia de estados procesales, y cada estado define cuántos días corren y si son hábiles o corridos."
            />

            <Tabs
                tabs={JURISDICTION_TABS}
                active={jurisdiction}
                onChange={changeJurisdiction}
            />

            <Panel
                title="Ciclo de vida y plazos"
                sub="Cada estado lleva su plazo. Un mismo nombre puede existir en más de un fuero."
                actions={
                    <>
                        <SearchInput
                            placeholder="Buscar estado"
                            aria-label="Buscar estado procesal"
                            value={search}
                            onChange={(e) => changeSearch(e.target.value)}
                        />
                        <Button
                            icon={<Icon name="plus" />}
                            size="md"
                            onClick={openCreate}
                        >
                            Registrar estado
                        </Button>
                    </>
                }
                footer={
                    <Pagination
                        page={pagination?.page ?? 1}
                        totalPages={pagination?.totalPages ?? 1}
                        totalItems={pagination?.totalItems ?? 0}
                        onChange={setPage}
                    />
                }
            >
                {query.isPending ? (
                    <div className="vz-empty">
                        <div className="vz-empty__title">Cargando estados…</div>
                    </div>
                ) : query.isError ? (
                    <div className="vz-empty">
                        <div className="vz-empty__title">No se pudieron cargar los estados</div>
                        <div className="vz-empty__text">
                            {isApiError(query.error)
                                ? query.error.message
                                : 'Ocurrió un error inesperado.'}
                        </div>
                    </div>
                ) : (
                    <ProceduralStatesTable
                        rows={rows}
                        firstRowNumber={(page - 1) * LIMIT + 1}
                        onEdit={openEdit}
                        onDelete={(state) => setModal({ kind: 'delete', state })}
                        empty={
                            <div className="vz-empty">
                                <div className="vz-empty__title">Sin estados procesales</div>
                                <div className="vz-empty__text">
                                    No hay estados que coincidan con la búsqueda o el fuero elegido.
                                </div>
                            </div>
                        }
                    />
                )}
            </Panel>

            {(modal?.kind === 'create' || modal?.kind === 'edit') && (
                <ProceduralStateFormModal
                    mode={modal.kind}
                    sub={
                        modal.kind === 'edit'
                            ? `${modal.state.name} · fuero ${modal.state.jurisdiction}`
                            : `Ciclo de vida del fuero ${values.jurisdiction}`
                    }
                    values={values}
                    errors={errors}
                    saving={saving}
                    onChange={(k, v) => setValues((s) => ({ ...s, [k]: String(v) }))}
                    onConfirm={submitForm}
                    onCancel={closeModal}
                />
            )}

            {modal?.kind === 'delete' && (
                <DeleteProceduralStateModal
                    state={modal.state}
                    saving={saving}
                    onConfirm={confirmDelete}
                    onCancel={closeModal}
                />
            )}
        </>
    );
}
