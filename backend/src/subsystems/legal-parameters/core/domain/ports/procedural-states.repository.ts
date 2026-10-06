import { ProcStateFilter } from '../../application/common/get-proc-states.interfaces';
import { ProceduralState } from '../entities/procedural-states';
import { JurisdictionCode } from '../value-objects/jurisdiction-code';
import { PaginatedResult } from '../../../../../common/pagination/paginated-result';

export interface ProceduralStateRepository {
  save(procState: ProceduralState): Promise<void>;
  findAll(): Promise<ProceduralState[]>;
  findPaginated(filter: ProcStateFilter, page: number, limit: number): Promise<PaginatedResult<ProceduralState>>;
  /** The initial state ("Iniciada") of an active jurisdiction, or `null` if there is none. */
  findInitialByJurisdiction(jurisdiction: JurisdictionCode): Promise<ProceduralState | null>;
}

export const ProceduralStateRepository = Symbol('ProceduralStateRepository');
