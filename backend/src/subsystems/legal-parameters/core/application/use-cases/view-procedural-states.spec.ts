import { Test, TestingModule } from '@nestjs/testing';
import { ViewProceduralStates } from './view-procedural-states.use-case';
import { ProceduralStateRepository } from '../../domain/ports/procedural-states.repository';
import { ProceduralStateInMemoryRepository } from '@subsystems/legal-parameters/infraestructure/persistence/proc-state-in-memo.repository';

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

  it('debería devolver todos los usuarios cargados', async () => {
    await repository.save(new User('1', 'Ana'));
    await repository.save(new User('2', 'Luis'));

    const result = await useCase.getAll();

    expect(result).toHaveLength(2);
    expect(result.map((u) => u.name)).toEqual(['Ana', 'Luis']);
  });
});
