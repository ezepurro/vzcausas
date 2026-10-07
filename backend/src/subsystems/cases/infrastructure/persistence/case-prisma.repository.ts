import { Injectable } from '@nestjs/common';
import { PrismaService } from '@shared/infrastructure/prisma/prisma.service';
import { ProceduralRole as PrismaProceduralRole } from '../../../../generated/prisma/enums';
import { AdministrativeCase } from '../../core/domain/entities/administrative';
import { Amparo } from '../../core/domain/entities/amparo';
import { Case } from '../../core/domain/entities/cases';
import { CriminalCase } from '../../core/domain/entities/criminal';
import { CaseRepository } from '../../core/domain/ports/case.repository';
<<<<<<< HEAD
import { ProceduralStateRef } from '../../core/domain/ports/legal-parameters-lookup.port';
=======
import { ProceduralAct } from '../../core/domain/entities/procedural-act';
import { DayType } from '../../core/domain/value-objects/day-type';
import { ProceduralStateRef } from '../../core/domain/ports/proc-state-lookup.port';
>>>>>>> 178097f (feat(back): register proc act - entities & usecase created)
import { CasePrismaMapper } from './case-prisma.mapper';

@Injectable()
export class CasePrismaRepository implements CaseRepository {
  constructor(private readonly prisma: PrismaService) {}

  async nextId(): Promise<number> {
    const [{ nextval }] = await this.prisma.db.$queryRaw<[{ nextval: bigint }]>`
      SELECT nextval(pg_get_serial_sequence('cases', 'id'))
    `;
    return Number(nextval);
  }

  async existsBySacNumber(sacNumber: string): Promise<boolean> {
    // Inactive cases count too: the SAC is unique system-wide (RN2).
    const row = await this.prisma.db.case.findUnique({ where: { sacNumber }, select: { id: true } });
    return row !== null;
  }

  async save(newCase: Case): Promise<void> {
    const hasCounterparty = newCase instanceof AdministrativeCase || newCase instanceof Amparo;
    const offenses = newCase instanceof CriminalCase ? newCase.offenses : [];

    // One nested create: the case and its offenses are saved together or not at all.
    // The use case calculates the prescription of every offense before saving.
    for (const offense of offenses) {
      if (offense.prescriptionExpiresOn === null) {
        throw new Error(`The offense of the qualification ${offense.legalQualificationId} has no prescription date.`);
      }
    }

    await this.prisma.db.case.create({
      data: {
        id: newCase.id,
        sacNumber: newCase.sacNumber,
        caption: newCase.caption,
        court: newCase.court,
        jurisdictionId: newCase.jurisdictionId,
        proceduralRole: newCase.proceduralRole as PrismaProceduralRole,
        instructorName: newCase.instructor.name,
        instructorPhone: newCase.instructor.phone,
        instructorExtension: newCase.instructor.extension,
        counterparty: hasCounterparty ? newCase.counterparty : null,
        subjectMatter: hasCounterparty ? newCase.subjectMatter : null,
        clientId: newCase.clientId,
        responsibleLawyerId: newCase.responsibleLawyerId,
        startDate: newCase.startDate,
        currentStateId: newCase.currentStateId,
        currentCustomState: newCase.currentCustomState,
        currentProceduralActId: newCase.currentProceduralActId,
        active: newCase.active,
        createdByUserId: newCase.createdByUserId,
        createdAt: newCase.createdAt,
        updatedAt: newCase.updatedAt,
        offenses: {
          create: offenses.map((offense) => ({
            legalQualificationId: offense.legalQualificationId,
            offenseDate: offense.offenseDate,
            prescriptionDate: offense.prescriptionExpiresOn as Date,
          })),
        },
      },
    });
  }

  async findById(id: number): Promise<Case | null> {
    const row = await this.prisma.db.case.findUnique({
      where: { id },
      include: { jurisdiction: true, offenses: { include: { legalQualification: true } } },
    });
    return row ? CasePrismaMapper.toDomain(row) : null;
  }

  async findCurrentState(caseId: number): Promise<ProceduralStateRef> {
    const row = await this.prisma.db.case.findUniqueOrThrow({
      where: { id: caseId },
      select: {
        currentState: {
          select: {
            stateId: true,
            name: true,
            isInitial: true,
            jurisdictionId: true,
            terminal: true,
            isActive: true,
            timeLimitDays: true,
            dayType: true,
          },
        },
      },
    });
    const state = row.currentState;
    if (!state) {
      throw new Error(`The case ${caseId} has no procedural state.`);
    }
    return {
      id: state.stateId,
      name: state.name,
      isInitial: state.isInitial,
      jurisdictionId: state.jurisdictionId,
      terminal: state.terminal,
      isActive: state.isActive,
      timeLimitDays: state.timeLimitDays,
      dayType: state.dayType as DayType,
    };
  }

  // TODO(HU26, infrastructure step): the next two methods and the load of the current act in `findById`.
  async nextProceduralActId(): Promise<number> {
    throw new Error('Not implemented yet.');
  }

  async saveProceduralAct(_updatedCase: Case, _act: ProceduralAct): Promise<void> {
    throw new Error('Not implemented yet.');
  }
}
