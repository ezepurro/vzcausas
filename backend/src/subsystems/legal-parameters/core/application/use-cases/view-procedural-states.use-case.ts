import { Inject, Injectable } from '@nestjs/common';
import { ProceduralState } from '../../domain/entities/procedural-states';
import { ProceduralStateRepository } from '../../domain/ports/procedural-states.repository';

@Injectable()
export class ViewProceduralStates {
  constructor(
    @Inject(ProceduralStateRepository)
    private readonly procStateRepo: ProceduralStateRepository,
  ) {}

  async getAll(): Promise<ProceduralState[]> {
    console.log('Use Case');
    return await this.procStateRepo.findAll();
  }
}
