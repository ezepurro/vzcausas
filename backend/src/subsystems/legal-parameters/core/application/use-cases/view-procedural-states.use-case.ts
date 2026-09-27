import { Inject, Injectable } from '@nestjs/common';
import { ProceduralState } from '../../domain/entities/procedural-states';
import { ProceduralStateRepository } from '../../domain/ports/procedural-states.repository';
import { GetProcStatesInput } from '../common/get-proc-states.interfaces';

@Injectable()
export class ViewProceduralStates {
  constructor(
    @Inject(ProceduralStateRepository)
    private readonly procStateRepo: ProceduralStateRepository,
  ) {}

  async getAll(queryParams: GetProcStatesInput): Promise<ProceduralState[]> {
    console.log('Use Case');
    const offset = (queryParams.page - 1) * queryParams.limit;

    return await this.procStateRepo.findAndCountAll();
  }
}
