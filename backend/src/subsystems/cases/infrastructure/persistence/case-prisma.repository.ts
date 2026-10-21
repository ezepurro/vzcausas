import { Injectable } from '@nestjs/common';
import { PrismaService } from '@shared/infrastructure/prisma/prisma.service';
import { DayType as PrismaDayType, ProceduralRole as PrismaProceduralRole } from '../../../../generated/prisma/enums';
import { Case } from '../../core/domain/entities/cases';
import { CaseRepository } from '../../core/domain/ports/case.repository';
import { ProceduralStateRef } from '../../core/domain/ports/legal-parameters-lookup.port';
import { DayType } from '../../core/domain/value-objects/day-type';
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
    // The data of each jurisdiction (D-67) is already `null` outside its own in the snapshot;
    // the `ck_cases_harmful_act_*` constraints agree with how the factory builds them.
    const data = newCase.toSnapshot();

    // One nested create: the case and its offenses are saved together or not at all.
    // Every offense already carries its prescription date (`CriminalCase` calculates
    // it, and `Offense.toSnapshot` refuses one without it).

    await this.prisma.db.case.create({
      data: {
        id: data.id,
        sacNumber: data.sacNumber,
        caption: data.caption,
        court: data.court,
        jurisdictionId: data.jurisdictionId,
        proceduralRole: data.proceduralRole as PrismaProceduralRole,
        instructorName: data.instructor.name,
        instructorPhone: data.instructor.phone,
        instructorExtension: data.instructor.extension,
        counterparty: data.counterparty,
        subjectMatter: data.subjectMatter,
        clientId: data.clientId,
        responsibleLawyerId: data.responsibleLawyerId,
        startDate: data.startDate,
        courtFeePaid: data.courtFeePaid,
        clientDetained: data.clientDetained,
        injunctionGranted: data.injunctionGranted,
        harmfulActDate: data.harmfulActDate,
        harmfulActRenews: data.harmfulActRenews,
        harmfulActRenewalDays: data.harmfulActRenewalDays,
        harmfulActTermDays: data.harmfulActTermDays,
        harmfulActTermDayType: data.harmfulActTermDayType as PrismaDayType | null,
        administrativeRemedyExhaustedOn: data.administrativeRemedyExhaustedOn,
        currentStateId: data.currentStateId,
        currentCustomState: data.currentCustomState,
        currentProceduralActId: data.currentProceduralActId,
        active: data.active,
        // The folder is asked for after the case is saved (`RequestCaseFolder`),
        // which is what moves it to `CREATING`.
        folderStatus: 'PENDING',
        createdByUserId: data.createdByUserId,
        createdAt: data.createdAt,
        updatedAt: data.updatedAt,
        offenses: {
          create: data.offenses.map((offense) => ({
            legalQualificationId: offense.legalQualificationId,
            offenseDate: offense.offenseDate,
            prescriptionDate: offense.prescriptionExpiresOn,
          })),
        },
      },
    });
  }

  async findById(id: number): Promise<Case | null> {
    const row = await this.prisma.db.case.findUnique({
      where: { id },
      include: {
        jurisdiction: true,
        offenses: { include: { legalQualification: true } },
        currentState: true,
        currentProceduralAct: true,
      },
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
            isPrescribed: true,
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
      isPrescribed: state.isPrescribed,
      isActive: state.isActive,
      timeLimitDays: state.timeLimitDays,
      dayType: state.dayType as DayType,
    };
  }

  async saveCurrentAct(updatedCase: Case): Promise<void> {
    // One UPDATE, so the state and the custom state change together and keep the CHECK that exactly one is set.
    await this.prisma.db.case.update({
      where: { id: updatedCase.id },
      data: {
        currentStateId: updatedCase.currentStateId,
        currentCustomState: updatedCase.currentCustomState,
        currentProceduralActId: updatedCase.currentProceduralActId,
        updatedAt: updatedCase.updatedAt,
      },
    });
  }
}
