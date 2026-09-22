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
    ROLES,
    ROLE_PRECEDENCE,
    type ChangePasswordRequest,
    type CreateLawyerRequest,
    type CreateProceduralStateRequest,
    type CreateUserRequest,
    type DayType,
    type EmbeddedLawyer,
    type ErrorBody,
    type ErrorCode,
    type ItemResponse,
    type Jurisdiction,
    type Lawyer,
    type LawyersQuery,
    type ListResponse,
    type LoginErrorBody,
    type LoginRequest,
    type PaginatedQuery,
    type Pagination,
    type ProceduralState,
    type ProceduralStatesQuery,
    type RefreshedSession,
    type Role,
    type SessionPrincipal,
    type Session,
    type UpdateLawyerRequest,
    type UpdateProceduralStateRequest,
    type UpdateUserRequest,
    type User,
    type UsersQuery,
} from './contract';

export {
    db,
    expireIssuedTokens,
    issueToken,
    resetMockDb,
    revokeToken,
    revokeUserSessions,
    toUser,
    userForRenewal,
    userFromToken,
    type MockDb,
} from './db';

export {
    CREDENTIALS,
    DEFAULT_PASSWORD,
    EXPIRES_IN,
    LAWYERS,
    LAWYERS_WITH_DEPENDENCIES,
    PROCEDURAL_STATES,
    PROCEDURAL_STATES_WITH_DEPENDENCIES,
    PROTECTED_ADMIN_USER,
    USERS,
    USERS_WITH_DEPENDENCIES,
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
    NO_CONTENT,
    RESPONSES,
    type BusinessRuleOperation,
    type MockResponse,
} from './responses';
