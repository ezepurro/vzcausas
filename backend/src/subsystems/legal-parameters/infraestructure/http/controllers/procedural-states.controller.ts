import { Body, Controller, Get, Post } from '@nestjs/common';
import { ViewProceduralStates } from '@subsystems/legal-parameters/core/application/use-cases/view-procedural-states.use-case';

@Controller({ path: 'procedural-states', version: ['1'] })
export class ProceduralStatesController {
  constructor(private readonly findProcStateUseCase: ViewProceduralStates) {}

  @Get()
  findAll() {
    console.log('Controller');
    return this.findProcStateUseCase.getAll();
  }
}
