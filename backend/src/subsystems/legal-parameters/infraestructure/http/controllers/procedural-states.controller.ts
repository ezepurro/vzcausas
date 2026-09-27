import { Controller, Get, Query } from '@nestjs/common';
import { ViewProceduralStates } from '@subsystems/legal-parameters/core/application/use-cases/view-procedural-states.use-case';
import { getStatesQueryDto } from '../dtos/get-states.dto';
import { ProceduralStatesListResponseDto } from '../dtos/procedural-state.response.dto';
import { ProceduralStateHttpMapper } from '../mappers/procedural-state-http.mapper';

@Controller({ path: 'procedural-states', version: ['1'] })
export class ProceduralStatesController {
  constructor(private readonly findProcStateUseCase: ViewProceduralStates) {}

  @Get()
  async findAll(@Query() query: getStatesQueryDto): Promise<ProceduralStatesListResponseDto> {
    const result = await this.findProcStateUseCase.getAll(query);
    return ProceduralStateHttpMapper.toListResponse(result);
  }
}
