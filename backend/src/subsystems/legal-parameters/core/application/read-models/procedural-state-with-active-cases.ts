import { ProceduralState } from '../../domain/entities/procedural-states';

/**
 * What the `GET`s of `/procedural-states` hand to the HTTP layer: the state
 * plus its `activeCases`. A read model, not an entity: `activeCases` is
 * computed by `cases` on every read, it is not part of the state and the
 * state never stores it.
 */
export type ProceduralStateWithActiveCases = {
  procState: ProceduralState;
  activeCases: number;
};
