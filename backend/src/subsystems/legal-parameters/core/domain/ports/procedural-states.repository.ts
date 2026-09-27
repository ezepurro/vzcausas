import { ProcStateFilter } from '../../application/common/get-proc-states.interfaces';
import { ProceduralState } from '../entities/procedural-states';
import { PaginatedResult } from '../../../../../common/pagination/paginated-result';

export interface ProceduralStateRepository {
  save(procState: ProceduralState): Promise<void>;
  findAll(): Promise<ProceduralState[]>;
  findPaginated(filter: ProcStateFilter, page: number, limit: number): Promise<PaginatedResult<ProceduralState>>;
}

export const ProceduralStateRepository = Symbol('ProceduralStateRepository');
