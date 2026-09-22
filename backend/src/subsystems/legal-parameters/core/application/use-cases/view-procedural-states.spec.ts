import { Test, TestingModule } from '@nestjs/testing';
import { ViewProceduralStates } from './view-procedural-states.use-case';
import { ProceduralStateRepository } from '../../domain/ports/procedural-states.repository';
import { ProceduralStateInMemoryRepository } from '@subsystems/legal-parameters/infraestructure/persistence/proc-state-in-memo.repository';
import { ProceduralState } from '../../domain/entities/procedural-states';
import { DayType } from '../../domain/entities/day-types';
import { Jurisdiction } from '../../domain/entities/jurisdiction';

describe('GetAllUsersUseCase', () => {
  let useCase: ViewProceduralStates;
  let repository: ProceduralStateRepository;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        ViewProceduralStates,
        { provide: ProceduralStateRepository, useClass: ProceduralStateInMemoryRepository },
      ],
    }).compile();

    useCase = module.get<ViewProceduralStates>(ViewProceduralStates);
    repository = module.get<ProceduralStateRepository>(ProceduralStateRepository);
  });

  it('debería devolver todos los estados procesales cargados', async () => {
    const newProcState = {
      id: 1,
      name: 'Investigacion',
      dayType: DayType.BUSINESS,
      jurisdiction: Jurisdiction.create({ id: 1, name: 'ADMINISTRATIVE', dayTypeDefault: DayType.BUSINESS }),
      position: 1,
      timeLimitDays: 20,
    };
    await repository.save(ProceduralState.create(newProcState));

    const result = await useCase.getAll();

    expect(result).toHaveLength(1);
  });
});
