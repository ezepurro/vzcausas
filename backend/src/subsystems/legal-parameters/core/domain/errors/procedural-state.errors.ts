import { BusinessRuleError, ConflictError, NotFoundError, ValidationError } from '@shared/domain/domain-error';

/**
 * Emitted when a `PATCH` or a `DELETE` reaches the system state "Prescripta"
 * (D-53, HU33 CA-33.13, 422). Renaming it, changing its term or giving it de
 * baja would leave HU33 without the state it moves a case to. The request is
 * well formed: what the domain refuses is the resulting state, hence 422.
 */
export class ProceduralStateProtectedError extends BusinessRuleError {
  constructor() {
    super(
      'PROCEDURAL_STATE_PROTECTED',
      'El estado Prescripta es un estado del sistema y no puede modificarse ni darse de baja.',
    );
  }
}

/**
 * Emitted by `GetProceduralState`, `UpdateProceduralState` and
 * `DeactivateProceduralState` when no procedural state matches the id.
 *
 * Covers three cases on purpose: the state does not exist, it was
 * logically deleted (RN12), or it is the system state "Iniciada". Per the
 * API contract (`ProceduralStateNotFound`) the client must not be able to
 * tell them apart — a deactivated state and "Iniciada" are simply not part
 * of the resource.
 */
export class ProceduralStateNotFoundError extends NotFoundError {
  constructor() {
    super('PROCEDURAL_STATE_NOT_FOUND', 'No se encontró el estado procesal solicitado.');
  }
}

/**
 * Emitted by `RegisterProceduralState` (HU45) and `UpdateProceduralState`
 * (HU17) when another **active** state of the same jurisdiction already
 * has that name (case-insensitive), or when the name is the reserved
 * "Iniciada".
 *
 * Both cases share one error because the contract answers both with the
 * same 409 and code. Deactivated states do not count: dropping
 * "Archivada" must allow registering it again, which is why the unique
 * index in the database is partial (`WHERE is_active`).
 */
export class ProceduralStateAlreadyExistsError extends ConflictError {
  constructor() {
    super('PROCEDURAL_STATE_ALREADY_EXISTS', 'Ya existe un estado procesal con esa denominación en el fuero.');
  }
}

/**
 * Which side of the `timeLimitDays` ⇔ `dayType` rule was broken:
 * - `required`: the state opens a time limit (> 0) but `dayType` is `NONE`.
 * - `must-be-none`: the state opens no time limit (0) but `dayType` is not `NONE`.
 */
export type DayTypeViolation = 'required' | 'must-be-none';

const DAY_TYPE_MESSAGES: Record<DayTypeViolation, string> = {
  required: 'Debe indicarse el tipo de día cuando el plazo es mayor a 0.',
  'must-be-none': 'Debe ser NONE cuando el plazo es 0.',
};

/**
 * Emitted by `ProceduralState` when `dayType` is incoherent with
 * `timeLimitDays`: `0` days goes with `NONE`, and more than `0` with
 * `BUSINESS` or `CONSECUTIVE` (contract, `ProceduralStateCreate`).
 *
 * The database enforces the same rule with
 * `ck_procedural_states_day_type_matches_time_limit`; this error exists so
 * the caller gets the contract's field-level message instead of a raw
 * constraint violation.
 */
export class ProceduralStateDayTypeError extends ValidationError {
  constructor(violation: DayTypeViolation) {
    super('VALIDATION_ERROR', 'Los datos enviados no son válidos.', {
      dayType: DAY_TYPE_MESSAGES[violation],
    });
  }
}

/**
 * Emitted by `UpdateProceduralState` (HU17) when the body includes
 * `jurisdiction`, even with the value the state already has.
 *
 * The jurisdiction is fixed at creation: moving a state means
 * deactivating it and registering it in the right jurisdiction
 * (contract, `ProceduralStateUpdate`).
 */
export class ProceduralStateJurisdictionEditError extends ValidationError {
  constructor() {
    super('VALIDATION_ERROR', 'Los datos enviados no son válidos.', {
      jurisdiction: 'El fuero de un estado procesal no se puede modificar.',
    });
  }
}

/**
 * Emitted by `RegisterProceduralState` (HU45) when the jurisdiction code is
 * valid for the contract but there is no active jurisdiction with it in the
 * catalogue. The DTO already rejects codes outside `JurisdictionCode`, so
 * this only fires if the catalogue and the enum drift apart (e.g. a
 * jurisdiction deactivated in the database).
 *
 * Same field message as the contract's `InvalidJurisdictionError`, but with
 * `VALIDATION_ERROR`: here the jurisdiction travels in the body, not in the
 * query string.
 */
export class ProceduralStateJurisdictionNotFoundError extends ValidationError {
  constructor() {
    super('VALIDATION_ERROR', 'Los datos enviados no son válidos.', {
      jurisdiction: 'No existe un fuero procesal con ese nombre.',
    });
  }
}

/**
 * Emitted when the `stateId` path parameter is not a positive integer.
 * Syntactic, not semantic, but modeled as a domain error (not a bare Nest
 * exception) so the response carries the exact code the contract requires
 * (`INVALID_PATH_PARAMETER`), same as `InvalidUserIdError` in `identity`.
 */
export class ProceduralStateIdError extends ValidationError {
  constructor() {
    super('INVALID_PATH_PARAMETER', 'El identificador del estado procesal no es válido.', {
      stateId: 'Debe ser un número entero válido.',
    });
  }
}

/**
 * Emitted by `UpdateProceduralState` (HU17) when the body sets none of
 * `name`, `timeLimitDays`, `dayType` or `terminal` — the contract requires
 * at least one (`ProceduralStateUpdate`, `minProperties: 1`).
 */
export class ProceduralStateEmptyPatchError extends ValidationError {
  constructor() {
    super('VALIDATION_ERROR', 'Los datos enviados no son válidos.', {
      body: 'Debe enviarse al menos un campo para modificar.',
    });
  }
}
