import { ProceduralState } from '../entities/procedural-states';

export interface ProceduralStateRepository {
  save(procState: ProceduralState): Promise<void>;
  findAll(): Promise<ProceduralState[]>;
}

export const ProceduralStateRepository = Symbol('ProceduralStateRepository');
