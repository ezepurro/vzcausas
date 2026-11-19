import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { PrismaService } from '@shared/infrastructure/prisma/prisma.service';
import { CaseResponsibleChange } from '../../../core/domain/entities/case-responsible-change.entity';
import {
  CaseTimelineQueryPort,
  CaseTimelineSources,
  ResponsibleChangeView,
} from '../../../core/domain/ports/case/case-timeline-query.port';
import { Prisma } from '../../../../../generated/prisma/client';
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
 * D-147: the lawyers are not filtered by `active` (RN12): one given de baja still figures.
 * `changedBy` is the USER, with the names of `users`.
 */
const RESPONSIBLE_CHANGE_INCLUDE = {
  previousLawyer: { select: { id: true, lastName: true, firstName: true } },
  newLawyer: { select: { id: true, lastName: true, firstName: true } },
  changedBy: { select: { id: true, lastName: true, firstName: true } },
} satisfies Prisma.CaseResponsibleChangeInclude;

type ResponsibleChangeRow = Prisma.CaseResponsibleChangeGetPayload<{ include: typeof RESPONSIBLE_CHANGE_INCLUDE }>;

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
  private readonly timeZone: string;

  constructor(
    private readonly prisma: PrismaService,
    config: ConfigService,
  ) {
    this.timeZone = config.getOrThrow<string>('APP_TIMEZONE');
  }

  /**
   * The four reads share one `$transaction`, so they see the same snapshot:
   * an act registered halfway could otherwise appear in one source and leave
   * `currentProceduralActId` pointing at an act the list does not have.
   */
  async findSources(caseId: number): Promise<CaseTimelineSources | null> {
    const [caseRow, proceduralRows, interruptiveRows, responsibleChangeRows] = await this.prisma.$transaction([
      this.prisma.db.case.findFirst({ where: { id: caseId, active: true }, select: CASE_SELECT }),
      this.prisma.db.proceduralAct.findMany({
        // An act given de baja leaves the timeline (HU29, D-124).
        where: { caseId, active: true },
        include: PROCEDURAL_ACT_INCLUDE,
        orderBy: PROCEDURAL_ACTS_NEWEST_FIRST,
      }),
      this.prisma.db.interruptiveAct.findMany({
        where: { caseId },
        include: INTERRUPTIVE_ACT_INCLUDE,
        orderBy: INTERRUPTIVE_ACTS_NEWEST_FIRST,
      }),
      // D-147: newest first is done in memory with the other sources.
      this.prisma.db.caseResponsibleChange.findMany({
        where: { caseId },
        include: RESPONSIBLE_CHANGE_INCLUDE,
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
      responsibleChanges: responsibleChangeRows.map((row) => this.toResponsibleChangeView(row)),
      offenses: caseRow.offenses.map((offense) => ({
        legalQualificationId: offense.legalQualification.id,
        legalQualificationName: offense.legalQualification.name,
        prescriptionMonths: offense.legalQualification.prescriptionMonths,
        offenseDate: offense.offenseDate,
        prescriptionDeclaration: toOffensePrescriptionDeclarationView(caseId, offense),
      })),
    };
  }

  private toResponsibleChangeView(row: ResponsibleChangeRow): ResponsibleChangeView {
    return {
      id: row.id,
      change: CaseResponsibleChange.create({
        caseId: row.caseId,
        previousLawyerId: row.previousLawyerId,
        newLawyerId: row.newLawyerId,
        changedByUserId: row.changedByUserId,
        origin: row.origin,
        changedAt: row.changedAt,
      }),
      previousLawyer: row.previousLawyer,
      newLawyer: row.newLawyer,
      changedBy: row.changedBy,
      changedOn: this.civilDateOf(row.changedAt),
    };
  }

  /** The civil date of an instant in the study's time zone, at midnight UTC (as `ClockPort.today()`). */
  private civilDateOf(instant: Date): Date {
    // The `en-CA` locale formats a date as YYYY-MM-DD.
    const civilDate = new Intl.DateTimeFormat('en-CA', {
      timeZone: this.timeZone,
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
    }).format(instant);
    return new Date(`${civilDate}T00:00:00.000Z`);
  }
}
