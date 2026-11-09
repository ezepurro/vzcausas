import { Injectable } from '@nestjs/common';
import { PrismaService } from '@shared/infrastructure/prisma/prisma.service';
import { CaseTimelineQueryPort, CaseTimelineSources } from '../../../core/domain/ports/case/case-timeline-query.port';
import {
  INTERRUPTIVE_ACT_INCLUDE,
  INTERRUPTIVE_ACTS_NEWEST_FIRST,
  toInterruptiveActView,
} from './prisma-interruptive-act.repository';
import {
  OFFENSE_PRESCRIPTION_DECLARATION_SELECT,
  PRESCRIPTION_DECLARATION_SELECT,
  toOffensePrescriptionDeclarationView,
  toPrescriptionDeclarationView,
} from '../mappers/prescription-declaration-prisma.mapper';
import {
  PROCEDURAL_ACT_INCLUDE,
  PROCEDURAL_ACTS_NEWEST_FIRST,
  toProceduralActView,
} from './prisma-procedural-act.repository';

/** What the line of life needs from the case row itself: its current act and its prescription declaration. */
const CASE_SELECT = {
  currentProceduralActId: true,
  ...PRESCRIPTION_DECLARATION_SELECT,
  // D-113: the offenses, with their declarations: entries of their own, and
  // what decides which interruptive act governs.
  offenses: {
    select: {
      offenseDate: true,
      ...OFFENSE_PRESCRIPTION_DECLARATION_SELECT,
      legalQualification: { select: { id: true, name: true, prescriptionMonths: true } },
    },
  },
} as const;

/**
 * Prisma-backed {@link CaseTimelineQueryPort} (HU27).
 *
 * The acts are read with the same include and mapping as their own listings
 * (`PrismaProceduralActRepository`, `PrismaInterruptiveActRepository`), so
 * an entry of the line of life cannot differ from the act it shows. Unlike
 * those listings, nothing here is paginated: the line of life must be complete.
 */
@Injectable()
export class CaseTimelinePrismaAdapter implements CaseTimelineQueryPort {
  constructor(private readonly prisma: PrismaService) {}

  /**
   * The three reads share one `$transaction`, so they see the same snapshot:
   * an act registered halfway could otherwise appear in one source and leave
   * `currentProceduralActId` pointing at an act the list does not have.
   */
  async findSources(caseId: number): Promise<CaseTimelineSources | null> {
    const [caseRow, proceduralRows, interruptiveRows] = await this.prisma.$transaction([
      this.prisma.db.case.findFirst({ where: { id: caseId, active: true }, select: CASE_SELECT }),
      this.prisma.db.proceduralAct.findMany({
        where: { caseId },
        include: PROCEDURAL_ACT_INCLUDE,
        orderBy: PROCEDURAL_ACTS_NEWEST_FIRST,
      }),
      this.prisma.db.interruptiveAct.findMany({
        where: { caseId },
        include: INTERRUPTIVE_ACT_INCLUDE,
        orderBy: INTERRUPTIVE_ACTS_NEWEST_FIRST,
      }),
    ]);

    if (caseRow === null) {
      return null;
    }

    return {
      currentProceduralActId: caseRow.currentProceduralActId,
      proceduralActs: proceduralRows.map(toProceduralActView),
      interruptiveActs: interruptiveRows.map(toInterruptiveActView),
      prescriptionDeclaration: toPrescriptionDeclarationView(caseId, caseRow),
      offenses: caseRow.offenses.map((offense) => ({
        legalQualificationId: offense.legalQualification.id,
        legalQualificationName: offense.legalQualification.name,
        prescriptionMonths: offense.legalQualification.prescriptionMonths,
        offenseDate: offense.offenseDate,
        prescriptionDeclaration: toOffensePrescriptionDeclarationView(caseId, offense),
      })),
    };
  }
}
