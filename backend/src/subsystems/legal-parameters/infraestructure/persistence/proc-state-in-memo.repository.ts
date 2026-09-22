import { Injectable } from '@nestjs/common';
import { ProceduralState } from '@subsystems/legal-parameters/core/domain/entities/procedural-states';
import { ProceduralStateRepository } from '@subsystems/legal-parameters/core/domain/ports/procedural-states.repository';

@Injectable()
export class ProceduralStateInMemoryRepository implements ProceduralStateRepository {
  private readonly procStates: ProceduralState[] = [];

  async save(procState: ProceduralState): Promise<void> {
    this.procStates.push(procState);
  }

  async findAll(): Promise<ProceduralState[]> {
    console.log('Repo');
    return [...this.procStates];
  }
}
