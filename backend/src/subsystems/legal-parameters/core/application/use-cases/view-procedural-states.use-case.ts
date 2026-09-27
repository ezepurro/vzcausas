import { Inject, Injectable } from '@nestjs/common';
import { ProceduralState } from '../../domain/entities/procedural-states';
import { ProceduralStateRepository } from '../../domain/ports/procedural-states.repository';
import { GetProcStatesInput, ProcStateFilter } from '../common/get-proc-states.interfaces';
import { PaginatedResult } from '../../../../../common/pagination/paginated-result';

@Injectable()
export class ViewProceduralStates {
  constructor(
    @Inject(ProceduralStateRepository)
    private readonly procStateRepo: ProceduralStateRepository,
  ) {}

  async getAll(queryParams: GetProcStatesInput): Promise<PaginatedResult<ProceduralState>> {
    console.log('Use Case');
    const filter: ProcStateFilter = {
      jurisdictionName: queryParams.jurisdictionName,
      search: queryParams.search?.trim() || undefined,
    };
    return await this.procStateRepo.findPaginated(filter, queryParams.page, queryParams.limit);
  }
}
