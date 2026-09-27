import { Body, Controller, Get, Post, Query } from '@nestjs/common';
import { ViewProceduralStates } from '@subsystems/legal-parameters/core/application/use-cases/view-procedural-states.use-case';
import { getStatesQueryDto } from '../dtos/get-states.dto';
import { Jurisdiction } from '@subsystems/legal-parameters/core/domain/entities/jurisdiction';

@Controller({ path: 'procedural-states', version: ['1'] })
export class ProceduralStatesController {
  constructor(private readonly findProcStateUseCase: ViewProceduralStates) {}

  @Get()
  findAll(@Query() query: getStatesQueryDto) {
    return this.findProcStateUseCase.getAll(query);
  }
}
