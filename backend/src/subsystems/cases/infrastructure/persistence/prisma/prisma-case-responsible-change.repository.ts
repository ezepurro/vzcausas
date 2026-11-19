import { Injectable } from '@nestjs/common';
import { PrismaService } from '@shared/infrastructure/prisma/prisma.service';
import { CaseResponsibleChange } from '../../../core/domain/entities/case-responsible-change.entity';
import { CaseResponsibleChangeRepository } from '../../../core/domain/ports/responsible-change/case-responsible-change.repository';

/**
 * Prisma-backed {@link CaseResponsibleChangeRepository} (D-147). It writes through
 * `prisma.db`, so it joins the ambient transaction of the use case that changes the case.
 */
@Injectable()
export class PrismaCaseResponsibleChangeRepository implements CaseResponsibleChangeRepository {
  constructor(private readonly prisma: PrismaService) {}

  async save(change: CaseResponsibleChange): Promise<void> {
    await this.prisma.db.caseResponsibleChange.create({
      data: {
        caseId: change.caseId,
        previousLawyerId: change.previousLawyerId,
        newLawyerId: change.newLawyerId,
        changedByUserId: change.changedByUserId,
        origin: change.origin,
        changedAt: change.changedAt,
      },
    });
  }
}
