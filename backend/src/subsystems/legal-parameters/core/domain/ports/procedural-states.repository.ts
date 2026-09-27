import { ProcStateFilter } from '../../application/common/get-proc-states.interfaces';
import { ProceduralState } from '../entities/procedural-states';

export interface ProceduralStateRepository {
  save(procState: ProceduralState): Promise<void>;
  findAll(): Promise<ProceduralState[]>;
  findPaginated(filter: ProcStateFilter, offset: Number): Promise<ProceduralState[]>;
}

export const ProceduralStateRepository = Symbol('ProceduralStateRepository');
