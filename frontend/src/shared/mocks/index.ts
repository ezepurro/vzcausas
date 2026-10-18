/**
 * Mocks de la API.
 *
 * Este barrel sólo exporta lo que **no depende de MSW**: el contrato, los
 * datos y el servidor falso puro. Así importar un tipo o un fixture desde una
 * feature no arrastra MSW al bundle.
 *
 * Lo que sí depende de la plataforma vive aparte:
 *
 * - navegador → `import { startMocks } from '@/shared/mocks/browser'`
 * - Node / tests → `import { server } from '@/shared/mocks/server'`
 * - configuración → `configureMocks`, reexportado por los dos anteriores
 *
 * Ver `README.md` de esta carpeta para el uso y para lo que el contrato deja
 * sin definir.
 */

export {
    buildPagination,
    errorBody,
    itemBody,
    listBody,
    permissionsFor,
    principalRole,
    BASE_PATH,
    DAY_TYPES,
    DEFAULT_LIMIT,
    DEFAULT_PAGE,
    ERROR_CODES,
    JURISDICTIONS,
    MAX_LIMIT,
    MIN_LIMIT,
    PROCEDURAL_ROLES,
    PROCEDURAL_ROLES_BY_JURISDICTION,
    ROLES,
    ROLE_PRECEDENCE,
    type ActDeadline,
    type Case,
    type CaseClient,
    type CaseLegalQualification,
    type CaseQualificationRequest,
    type CasesQuery,
    type CaseState,
    type ChangePasswordRequest,
    type Client,
    type ClientsQuery,
    type CreateCaseRequest,
    type CreateClientRequest,
    type CreateLawyerRequest,
    type CreateLegalQualificationRequest,
    type CreateProceduralActRequest,
    type CreateProceduralStateRequest,
    type CreateUserRequest,
    type CurrentState,
    type DayType,
    type DeadlinePreview,
    type DeadlinePreviewQuery,
    type EmbeddedLawyer,
    type ErrorBody,
    type ErrorCode,
    type ItemResponse,
    type Jurisdiction,
    type Lawyer,
    type LawyersQuery,
    type LegalQualification,
    type LegalQualificationsQuery,
    type ListResponse,
    type LoginErrorBody,
    type LoginRequest,
    type PaginatedQuery,
    type Pagination,
    type ProceduralAct,
    type ProceduralRole,
    type ProceduralState,
    type ProceduralStatesQuery,
    type RefreshedSession,
    type Role,
    type SessionPrincipal,
    type Session,
    type UpdateLawyerRequest,
    type UpdateLegalQualificationRequest,
    type UpdateProceduralStateRequest,
    type UpdateUserRequest,
    type User,
    type UsersQuery,
    type WrittenLegalQualification,
    type WrittenProceduralState,
} from './contract';

export {
    actsOf,
    db,
    expireIssuedTokens,
    isActiveCase,
    issueToken,
    latestActOf,
    resetMockDb,
    revokeToken,
    revokeUserSessions,
    toCase,
    toClient,
    toLawyer,
    toLegalQualification,
    toProceduralAct,
    toProceduralState,
    toUser,
    userForRenewal,
    userFromToken,
    type MockDb,
    type StoredAct,
    type StoredCase,
    type StoredCaseQualification,
} from './db';

export {
    addBusinessDays,
    addCalendarDays,
    addMonths,
    businessDaysUntil,
    computeDueDate,
    subtractBusinessDays,
    todayIso,
} from './calendar';

export {
    CASE_SEEDS,
    CLIENTS,
    CREDENTIALS,
    DEFAULT_PASSWORD,
    EXPIRES_IN,
    INITIAL_STATE_NAME,
    LAWYERS,
    LEGAL_QUALIFICATIONS,
    PROCEDURAL_STATES,
    PROTECTED_ADMIN_USER,
    USERS,
    USERS_WITH_DEPENDENCIES,
    type ActSeed,
    type CaseSeed,
    type SeedDate,
    type StoredClient,
    type StoredLegalQualification,
    type StoredProceduralState,
    type StoredUser,
} from './fixtures';

export {
    resolveRequest,
    IMPLEMENTED_ENDPOINTS,
    type HttpMethod,
    type MockRequest,
} from './handlers';

export {
    businessRuleViolation,
    ERRORS,
    forbiddenFor,
    NO_CONTENT,
    RESPONSES,
    type BusinessRuleOperation,
    type MockResponse,
} from './responses';
