import { Injectable } from '@nestjs/common';
import { ProceduralState } from '@subsystems/legal-parameters/core/domain/entities/procedural-states';
import { ProceduralStateRepository } from '@subsystems/legal-parameters/core/domain/ports/procedural-states.repository';
import { PaginatedResult } from '../../../../common/pagination/paginated-result';
import { PrismaService } from '@shared/infrastructure/prisma/prisma.service';
import { Prisma } from '@prisma/client';
import { ProcStateFilter } from '@subsystems/legal-parameters/core/application/common/get-proc-states.interfaces';

@Injectable()
export class ProceduralStatePrismaRepository implements ProceduralStateRepository {
  constructor(private readonly prisma: PrismaService) {}

  async save(procState: ProceduralState): Promise<void> {}

  async findAll(): Promise<ProceduralState[]> {
    throw new Error('Method not implemented.');
  }

  findPaginated(filter: ProcStateFilter, offset: Number): Promise<ProceduralState[]> {
    throw new Error('Method not implemented.');
  }

  async findAndCountAll(): Promise<ProceduralState[]> {
    throw new Error('Method not implemented.');
  }
}
