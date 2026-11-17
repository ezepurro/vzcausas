import { JurisdictionCode } from '../../../core/domain/value-objects/case/jurisdiction-code';
import { aCase, anOrphanedCase, NOW } from '../../../core/test-support/case-fixtures';
import { Case } from '../../../core/domain/entities/case/case.entity';
import { CasePrismaMapper, CaseRow } from './case-prisma.mapper';

/** The row `cases` would hold for a criminal case without offenses or acts: only what the mapper reads. */
function rowOf(target: Case): CaseRow {
  const data = target.toSnapshot();
  return {
    id: data.id,
    sacNumber: data.sacNumber,
    caption: data.caption,
    court: data.court,
    jurisdictionId: data.jurisdictionId,
    proceduralRole: data.proceduralRole,
    instructorName: data.instructor.name,
    instructorPhone: data.instructor.phone,
    instructorExtension: data.instructor.extension,
    counterparty: null,
    subjectMatter: null,
    clientId: data.clientId,
    responsibleLawyerId: data.responsibleLawyerId,
    orphanedAt: data.orphanedAt,
    startDate: data.startDate,
    clientDetained: false,
    injunctionGranted: null,
    harmfulActDate: null,
    harmfulActRenews: null,
    harmfulActRenewalDays: null,
    harmfulActTermDays: null,
    harmfulActTermDayType: null,
    administrativeRemedyExhaustedOn: null,
    courtFeePaid: data.courtFeePaid,
    folderStatus: null,
    cloudFolderId: null,
    prescriptionDate: null,
    prescriptionResolution: null,
    prescriptionGrounds: null,
    prescriptionRegisteredByUserId: null,
    prescriptionRegisteredAt: null,
    currentStateId: data.currentStateId,
    currentCustomState: data.currentCustomState,
    currentProceduralActId: null,
    active: data.active,
    deactivatedAt: null,
    deactivatedByUserId: null,
    deactivationReason: null,
    createdByUserId: data.createdByUserId,
    createdAt: data.createdAt,
    updatedAt: data.updatedAt,
    jurisdiction: {
      jurisdictionId: data.jurisdictionId,
      name: JurisdictionCode.CRIMINAL,
      isActive: true,
      dayTypeDefault: 'BUSINESS',
    },
    offenses: [],
    currentState: null,
    currentProceduralAct: null,
  } as CaseRow;
}

describe('CasePrismaMapper.toDomain', () => {
  it('una causa con responsable vuelve con su responsable y sin orphanedAt', () => {
    const original = aCase();

    const restored = CasePrismaMapper.toDomain(rowOf(original));

    expect(restored.responsibleLawyerId).toBe(original.responsibleLawyerId);
    expect(restored.orphanedAt).toBeNull();
    expect(restored.toSnapshot()).toEqual(original.toSnapshot());
  });

  it('una huérfana vuelve sin responsable y con orphanedAt, vigente y con su estado', () => {
    const original = anOrphanedCase();

    const restored = CasePrismaMapper.toDomain(rowOf(original));

    expect(restored.responsibleLawyerId).toBeNull();
    expect(restored.orphanedAt).toEqual(NOW);
    expect(restored.active).toBe(true);
    expect(restored.toSnapshot()).toEqual(original.toSnapshot());
  });

  it('una fila que viola ck_cases_orphaned_coherent es dato corrupto, no una causa', () => {
    const row = { ...rowOf(aCase()), orphanedAt: NOW };

    expect(() => CasePrismaMapper.toDomain(row)).toThrow('orphaned date');
  });
});
