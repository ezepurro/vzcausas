import { useState } from 'react';
import { isApiError } from '@/shared/api/ApiError';
import { useToast } from '@/app/providers/ToastContext';
import { Button, Icon, PageHeader, Pagination, Panel, SearchInput } from '@/shared/components/ui';
import { useLegalQualifications } from '@/features/legal-params/api/useLegalQualifications';
import { useCreateLegalQualification } from '@/features/legal-params/api/useCreateLegalQualification';
import type { LegalQualificationFormValues } from '@/features/legal-params/types/legalQualification';
import {
    isValid,
    validateLegalQualification,
    type LegalQualificationErrors,
} from '@/features/legal-params/schemas/legalQualification.schema';
import { formatPrescription } from '@/features/legal-params/utils/prescription';
import { toCreateLegalQualificationBody } from '@/features/legal-params/utils/toCreateLegalQualificationBody';
import { toLegalQualificationFormErrors } from '@/features/legal-params/utils/toLegalQualificationFormErrors';
import { LegalQualificationsTable } from '@/features/legal-params/components/LegalQualificationsTable';
import { LegalQualificationFormModal } from '@/features/legal-params/components/LegalQualificationFormModal';

const LIMIT = 20;

const EMPTY_FORM: LegalQualificationFormValues = {
    name: '',
    years: '',
    months: '0',
};

/**
 * Calificaciones legales: consulta (el listado con el buscador) y alta
 * (HU-48), en `/calificaciones-legales`. Sólo la ve el administrador, que es
 * quien puede registrarlas (V3 D-04).
 *
 * Modificar y dar de baja son de otra historia: la tabla va sin acciones.
 */
export function LegalQualificationsPage() {
    const toast = useToast();

    /* El paginado y la búsqueda viven acá y se le pasan al hook: `DataTable`
       no pagina ni filtra, y los parámetros tienen que estar en la clave de caché. */
    const [page, setPage] = useState(1);
    const [search, setSearch] = useState('');

    const [modalOpen, setModalOpen] = useState(false);
    const [values, setValues] = useState<LegalQualificationFormValues>(EMPTY_FORM);
    const [errors, setErrors] = useState<LegalQualificationErrors>({});

    const query = useLegalQualifications({
        page,
        limit: LIMIT,
        search: search.trim() === '' ? undefined : search.trim(),
    });
    const create = useCreateLegalQualification();

    const rows = query.data?.data ?? [];
    const pagination = query.data?.pagination;
    const searching = search.trim() !== '';

    /* ---------------- búsqueda ---------------- */

    function changeSearch(value: string) {
        setSearch(value);
        // Al buscar se vuelve a la primera página: si no, se puede quedar
        // parado en la página 3 de un resultado que ahora tiene una.
        setPage(1);
    }

    /* ---------------- alta ---------------- */

    function openCreate() {
        setValues(EMPTY_FORM);
        setErrors({});
        setModalOpen(true);
    }

    function changeValue(k: string, v: string | boolean) {
        setValues((current) => ({ ...current, [k]: v }));
    }

    /**
     * Los errores llegan siempre como `ApiError`. Se ramifica por código y por
     * los getters, nunca comparando `e.message`, y para mostrar se usa
     * `e.message`, que ya viene en castellano.
     */
    function handleApiError(error: unknown) {
        if (!isApiError(error)) throw error;

        // Es un 409, pero es el problema de UN campo: va en el campo, no en
        // un aviso suelto.
        if (error.is('LEGAL_QUALIFICATION_ALREADY_EXISTS')) {
            setErrors({ name: error.message });
            return;
        }

        if (error.isValidation) {
            const fieldErrors = toLegalQualificationFormErrors(error.details);
            if (!isValid(fieldErrors)) {
                setErrors(fieldErrors);
                return;
            }
            // Un 400 sin ningún campo que marcar no puede quedar mudo.
        }

        toast('error', error.message);
    }

    function submitForm() {
        const found = validateLegalQualification(values);
        setErrors(found);
        if (!isValid(found)) return;

        create.mutate(toCreateLegalQualificationBody(values), {
            onSuccess: (qualification) => {
                toast(
                    'success',
                    `Calificación registrada · prescripción ${formatPrescription(qualification.prescriptionMonths)}.`,
                );
                setModalOpen(false);
            },
            onError: handleApiError,
        });
    }

    /* ---------------- pantalla ---------------- */

    return (
        <>
            <PageHeader
                eyebrow="Administración"
                title="Calificaciones legales"
                sub="Cada calificación define el plazo de prescripción de la acción. Una causa penal puede tener varias."
            />

            <Panel
                actions={
                    <>
                        <SearchInput
                            placeholder="Buscar por nombre o artículo"
                            aria-label="Buscar calificación"
                            value={search}
                            onChange={(e) => changeSearch(e.target.value)}
                        />
                        <Button icon={<Icon name="plus" />} size="md" onClick={openCreate}>
                            Registrar calificación
                        </Button>
                    </>
                }
                footer={
                    <Pagination
                        page={pagination?.page ?? 1}
                        totalPages={pagination?.totalPages ?? 1}
                        totalItems={pagination?.totalItems ?? 0}
                        noun={['calificación', 'calificaciones']}
                        onChange={setPage}
                    />
                }
            >
                {query.isPending ? (
                    <div className="vz-empty">
                        <div className="vz-empty__title">Cargando calificaciones…</div>
                    </div>
                ) : query.isError ? (
                    <div className="vz-empty">
                        <div className="vz-empty__title">No se pudieron cargar las calificaciones</div>
                        <div className="vz-empty__text">
                            {isApiError(query.error)
                                ? query.error.message
                                : 'Ocurrió un error inesperado.'}
                        </div>
                    </div>
                ) : (
                    <LegalQualificationsTable
                        rows={rows}
                        empty={
                            <div className="vz-empty">
                                <div className="vz-empty__title">
                                    {searching
                                        ? 'Ninguna calificación coincide con la búsqueda'
                                        : 'Todavía no hay calificaciones legales'}
                                </div>
                                <div className="vz-empty__text">
                                    {searching
                                        ? 'Probá con otra parte del nombre o con el número de artículo.'
                                        : 'Registrá la primera para poder elegirla al registrar causas penales.'}
                                </div>
                            </div>
                        }
                    />
                )}
            </Panel>

            {modalOpen && (
                <LegalQualificationFormModal
                    mode="create"
                    values={values}
                    errors={errors}
                    saving={create.isPending}
                    onChange={changeValue}
                    onConfirm={submitForm}
                    onCancel={() => setModalOpen(false)}
                />
            )}
        </>
    );
}
