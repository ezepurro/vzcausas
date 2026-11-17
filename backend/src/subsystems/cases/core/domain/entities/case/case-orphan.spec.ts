import { Deactivation } from '@shared/domain/deactivation.vo';
import { ValidationError } from '@shared/domain/domain-error';
import { CannotOrphanCaseError, NotResponsibleLawyerError } from '../../errors/case.errors';
import { CaseDataRules } from '../../rules/case-data-rules';
import {
  aCase,
  anActor,
  anOrphanedCase,
  INITIAL_STATES,
  LAWYER,
  NOW,
  ROBBERY,
  TODAY,
} from '../../../test-support/case-fixtures';
import { JurisdictionCode } from '../../value-objects/case/jurisdiction-code';
import { CaseModificationContext } from './case-changes';
import { CriminalCase } from './criminal-case.entity';

/* HU15 · Causa huérfana (D-143): una causa vigente sin abogado responsable. */

const LATER = new Date('2026-10-07T10:00:00.000Z');

const context = (overrides: Partial<CaseModificationContext> = {}): CaseModificationContext => ({
  today: TODAY,
  now: LATER,
  referenceErrors: {},
  legalQualificationRefs: [ROBBERY],
  ...overrides,
});

describe('Case.leaveWithoutResponsible', () => {
  it('deja vigente la causa sin responsable y registra desde cuándo, con su estado procesal intacto', () => {
    const target = aCase();
    const before = target.toSnapshot();

    target.leaveWithoutResponsible(LATER);

    const after = target.toSnapshot();
    expect(after.responsibleLawyerId).toBeNull();
    expect(after.orphanedAt).toEqual(LATER);
    expect(after.active).toBe(true);
    expect(target.updatedAt).toEqual(LATER);
    expect(after).toEqual({
      ...before,
      responsibleLawyerId: null,
      orphanedAt: LATER,
      updatedAt: LATER,
    });
    expect(target.currentStateId).toBe(INITIAL_STATES[JurisdictionCode.CRIMINAL].id);
  });

  it('una causa que ya es huérfana no puede quedar huérfana otra vez', () => {
    const target = anOrphanedCase();

    expect(() => target.leaveWithoutResponsible(LATER)).toThrow(CannotOrphanCaseError);
    expect(target.orphanedAt).toEqual(NOW);
  });

  it('una causa dada de baja no puede quedar huérfana', () => {
    const target = aCase();
    target.deactivate(Deactivation.create({ reason: 'Causa duplicada.' }, { deactivatedByUserId: 9, deactivatedAt: LATER }));

    expect(() => target.leaveWithoutResponsible(LATER)).toThrow(CannotOrphanCaseError);
    expect(target.responsibleLawyerId).toBe(LAWYER.id);
    expect(target.orphanedAt).toBeNull();
  });
});

describe('Case: nacimiento y coherencia del responsable', () => {
  it('una causa registrada tiene responsable y no es huérfana (POST /cases exige abogado)', () => {
    const target = aCase();

    expect(target.responsibleLawyerId).toBe(LAWYER.id);
    expect(target.orphanedAt).toBeNull();
  });

  it.each([
    ['responsable nulo sin orphanedAt', { responsibleLawyerId: null, orphanedAt: null }],
    ['orphanedAt con responsable', { responsibleLawyerId: LAWYER.id, orphanedAt: NOW }],
  ])('no se reconstruye con %s: es la misma regla que ck_cases_orphaned_coherent', (_name, broken) => {
    const snapshot = aCase().toSnapshot();

    expect(() =>
      CriminalCase.hydrate({
        ...snapshot,
        ...broken,
        currentStateTerminal: false,
        proceduralActs: [],
        deactivation: null,
        offenses: [],
        clientDetained: false,
        prescriptionDeclaration: null,
      }),
    ).toThrow('orphaned date');
  });
});

describe('Case.modify sobre una huérfana', () => {
  it('reasignarla le borra orphanedAt y mueve la carpeta', () => {
    const target = anOrphanedCase();

    const changeSet = target.modify({ responsibleLawyerId: 5 }, context());

    expect(target.responsibleLawyerId).toBe(5);
    expect(target.orphanedAt).toBeNull();
    expect(changeSet.fields).toEqual(['responsibleLawyerId']);
    expect(changeSet.folderChanges()).toEqual(['responsibleLawyer']);
  });

  it('cambiar el responsable de una causa que tiene uno no inventa orphanedAt', () => {
    const target = aCase();

    target.modify({ responsibleLawyerId: 5 }, context());

    expect(target.responsibleLawyerId).toBe(5);
    expect(target.orphanedAt).toBeNull();
  });

  it('PATCH no acepta null: no se deja huérfana una causa desde la edición', () => {
    const target = aCase();
    const before = target.toSnapshot();

    let details: Record<string, unknown> | null = null;
    try {
      target.modify({ responsibleLawyerId: null }, context());
    } catch (error) {
      expect(error).toBeInstanceOf(ValidationError);
      details = (error as ValidationError).details;
    }

    expect(details).toEqual({ responsibleLawyerId: CaseDataRules.CANNOT_BE_EMPTIED });
    expect(target.toSnapshot()).toEqual(before);
  });

  it('PATCH con null sobre una huérfana tampoco la cambia', () => {
    const target = anOrphanedCase();

    expect(() => target.modify({ responsibleLawyerId: null }, context())).toThrow(ValidationError);
    expect(target.responsibleLawyerId).toBeNull();
    expect(target.orphanedAt).toEqual(NOW);
  });
});

describe('Case: quién opera una huérfana (nadie coincide con el responsable)', () => {
  const orphan = () => anOrphanedCase();

  it.each([
    ['el abogado que fue su responsable', anActor()],
    ['otro abogado', anActor({ lawyerId: 99 })],
    ['un abogado sin ficha', anActor({ lawyerId: null })],
    ['una SECRETARY', anActor({ roleNames: ['SECRETARY'], lawyerId: null })],
  ])('assertCanRegisterActs la deniega a %s', (_name, actor) => {
    expect(() => orphan().assertCanRegisterActs(actor)).toThrow(NotResponsibleLawyerError);
  });

  // D-143, D-144: los actos de una huérfana son del administrador, tenga o no ficha de abogado.
  it.each([
    ['un ADMINISTRATOR sin ficha', anActor({ roleNames: ['ADMINISTRATOR'], lawyerId: null })],
    ['un administrador que también es abogado', anActor({ roleNames: ['ADMINISTRATOR', 'LAWYER'] })],
  ])('assertCanRegisterActs la permite a %s', (_name, actor) => {
    expect(() => orphan().assertCanRegisterActs(actor)).not.toThrow();
  });

  it.each([
    ['el abogado que fue su responsable', anActor()],
    ['otro abogado', anActor({ lawyerId: 99 })],
    ['un abogado sin ficha', anActor({ lawyerId: null })],
  ])('assertCanBeOperatedBy la deniega a %s', (_name, actor) => {
    expect(() => orphan().assertCanBeOperatedBy(actor, NotResponsibleLawyerError.FOR_MODIFYING_CASE)).toThrow(
      NotResponsibleLawyerError,
    );
  });

  it.each([
    ['un ADMINISTRATOR', anActor({ roleNames: ['ADMINISTRATOR'], lawyerId: null })],
    ['una SECRETARY', anActor({ roleNames: ['SECRETARY'], lawyerId: null })],
  ])('assertCanBeOperatedBy la permite a %s, como siempre', (_name, actor) => {
    expect(() => orphan().assertCanBeOperatedBy(actor, NotResponsibleLawyerError.FOR_MODIFYING_CASE)).not.toThrow();
  });
});
