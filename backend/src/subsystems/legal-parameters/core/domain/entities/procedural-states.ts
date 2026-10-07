import { DayType } from './day-types';
import { Jurisdiction } from './jurisdiction';
import { ValidationError } from '@shared/domain/domain-error';
import { ProceduralStateAlreadyExistsError, ProceduralStateDayTypeError } from '../errors/procedural-state.errors';

/** Name of the system state where every case starts. */
export const INITIAL_STATE_NAME = 'Iniciada';

export interface ProceduralStateProps {
  id: number;
  name: string;
  timeLimitDays: number;
  dayType: DayType | null;
  terminal: boolean;
  // System state "Iniciada": one per jurisdiction, where every new case starts.
  isInitial: boolean;
  isActive: boolean;
  jurisdiction: Jurisdiction;
  createdAt: Date | null;
}

/**
 * Procedural state of a jurisdiction's lifecycle (RN4). Holds the
 * {@link Jurisdiction} it belongs to as an object, not as a name.
 *
 * Every change goes through a method that validates it first, so no
 * instance can hold an invalid state: there are getters but no setters on
 * purpose. Uniqueness of the name within the jurisdiction is not checked
 * here — it needs the other states, which only the repository can see, so
 * the use cases enforce it.
 */
export class ProceduralState {
  private constructor(private readonly props: ProceduralStateProps) {}

  /** Rebuilds a {@link ProceduralState} from persisted data, without validation. */
  static hydrate(props: ProceduralStateProps): ProceduralState {
    return new ProceduralState(props);
  }

  /**
   * HU45 — builds a new state, validating its invariants. The id comes from
   * the repository's `nextId()`, reserved by the use case beforehand.
   *
   * Stores a copy of `props` with the name trimmed: keeping the caller's
   * object would let them change the entity later without validation.
   *
   * @throws {ValidationError} if the id is not a positive integer, the name
   *   is blank, or `timeLimitDays` is not a non-negative integer.
   * @throws {ProceduralStateAlreadyExistsError} if the name is "Iniciada".
   * @throws {ProceduralStateDayTypeError} if `dayType` is incoherent with
   *   `timeLimitDays`.
   */
  static create(props: ProceduralStateProps): ProceduralState {
    if (!Number.isInteger(props.id) || props.id <= 0) {
      throw new ValidationError(
        'INVALID_PROCEDURAL_STATE',
        'El identificador del estado procesal debe ser un entero positivo.',
      );
    }

    ProceduralState.validateName(props.name);
    ProceduralState.validateTimeLimit(props.timeLimitDays, props.dayType);

    return new ProceduralState({ ...props, name: props.name.trim() });
  }

  /**
   * HU17 — renames the state. Cases that reference it pick up the new name
   * on their own: they point to the state by FK, they do not copy the name.
   *
   * @throws {ValidationError} if the name is blank.
   * @throws {ProceduralStateAlreadyExistsError} if the name is "Iniciada".
   */
  rename(newName: string): void {
    ProceduralState.validateName(newName);
    this.props.name = newName.trim();
  }

  /**
   * HU17 — changes the time limit the state opens. Takes both values
   * together because the rule is between them: changing them one at a time
   * would fail halfway (e.g. `0` days while still `BUSINESS`). On a partial
   * PATCH the use case fills the missing one with the current value.
   *
   * Does not recompute deadlines already registered: the new limit only
   * applies to acts registered from now on (contract, `ProceduralStateUpdate`).
   *
   * @throws {ValidationError} if `timeLimitDays` is not a non-negative integer.
   * @throws {ProceduralStateDayTypeError} if `dayType` is incoherent with it.
   */
  changeTimeLimit(timeLimitDays: number, dayType: DayType | null): void {
    ProceduralState.validateTimeLimit(timeLimitDays, dayType);
    this.props.timeLimitDays = timeLimitDays;
    this.props.dayType = dayType;
  }

  /**
   * HU17 — marks whether the state closes the case's lifecycle. No rule to
   * check, but it is still a method so every change goes through the entity.
   */
  changeTerminal(terminal: boolean): void {
    this.props.terminal = terminal;
  }

  /**
   * HU46 — logical deletion (RN12). The row is kept; only the flag flips.
   * Allowed even if cases are in this state: they keep it as their current
   * state until an act moves them elsewhere (contract, `DELETE`).
   *
   * Whether an already-deactivated state may be deactivated again is not
   * this entity's call — the use case rejects it as "not found".
   */
  deactivate(): void {
    this.props.isActive = false;
  }

  /**
   * Shared by {@link ProceduralState.create} and {@link ProceduralState.rename}
   * so both apply the same name rules. Static because `create` has no
   * instance yet.
   */
  private static validateName(name: string): void {
    if (!name || name.trim().length === 0) {
      throw new ValidationError('INVALID_PROCEDURAL_STATE', 'El estado procesal debe tener una denominación.');
    }

    // "Iniciada" is reserved for the system state; the contract answers 409.
    if (name.trim().toLowerCase() === INITIAL_STATE_NAME.toLowerCase()) {
      throw new ProceduralStateAlreadyExistsError();
    }
  }

  /**
   * Shared by {@link ProceduralState.create} and
   * {@link ProceduralState.changeTimeLimit}. `0` days ⇔ `NONE`; the database
   * enforces the same rule with `ck_procedural_states_day_type_matches_time_limit`.
   *
   * A `null` day type is read as `NONE`: the column is nullable in the
   * domain type but the contract never sends `null`.
   */
  private static validateTimeLimit(timeLimitDays: number, dayType: DayType | null): void {
    if (!Number.isInteger(timeLimitDays) || timeLimitDays < 0) {
      throw new ValidationError('VALIDATION_ERROR', 'Los datos enviados no son válidos.', {
        timeLimitDays: 'Debe ser un entero mayor o igual a 0.',
      });
    }

    const opensTimeLimit = timeLimitDays > 0;
    const hasDayType = (dayType ?? DayType.NONE) !== DayType.NONE;

    if (opensTimeLimit && !hasDayType) {
      throw new ProceduralStateDayTypeError('required');
    }
    if (!opensTimeLimit && hasDayType) {
      throw new ProceduralStateDayTypeError('must-be-none');
    }
  }

  get id(): number {
    return this.props.id;
  }

  get name(): string {
    return this.props.name;
  }

  get timeLimitDays(): number {
    return this.props.timeLimitDays;
  }

  get dayType(): DayType | null {
    return this.props.dayType;
  }

  get terminal(): boolean {
    return this.props.terminal;
  }

  get isInitial(): boolean {
    return this.props.isInitial;
  }

  get isActive(): boolean {
    return this.props.isActive;
  }

  get jurisdiction(): Jurisdiction {
    return this.props.jurisdiction;
  }

  get createdAt(): Date | null {
    return this.props.createdAt;
  }
}
