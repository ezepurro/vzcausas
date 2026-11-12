import {
  CannotDeclarePrescriptionError,
  CaseNotFoundError,
  LegalQualificationAlreadyPrescribedError,
  LegalQualificationNotInCaseError,
  NotResponsibleLawyerError,
  PrescriptionNotApplicableError,
} from '../../../domain/errors/case.errors';
import { CaseListItem } from '../../../domain/ports/case/case.repository';
import { CriminalCase } from '../../../domain/entities/case/criminal-case.entity';
import { FakeCaseRepository, FakeClock, FakeLegalParametersLookup } from '../../../test-support/case-fakes';
import {
  HOMICIDE,
  INITIAL_STATES,
  NOW,
  PRESCRIBED,
  ROBBERY,
  STATES_TABLE,
  TODAY,
  aCase,
  anActor,
  anAdministrativeCase,
  day,
} from '../../../test-support/case-fixtures';
import { GetCase } from '../case/get-case.use-case';
import {
  DeclareQualificationPrescription,
  DeclareQualificationPrescriptionCommand,
} from './declare-qualification-prescription.use-case';

/**
 * D-113 — `POST /cases/{caseId}/legal-qualifications/{legalQualificationId}/prescription`.
 * Plan: `.claude/plans/tests-d113-prescripcion-por-delito.md`. Las reglas viven en
 * el dominio (`case.entity.spec.ts`); acá, la coordinación: el orden de los
 * chequeos, que un rechazo no escriba y que la respuesta la arme `GetCase`.
 */

/** Stands for the detail: records which case it was asked for. */
class RecordingGetCase {
  readonly requested: number[] = [];

  async execute(query: { id: number }): Promise<CaseListItem> {
    this.requested.push(query.id);
    return { id: query.id } as CaseListItem;
  }
}

const aCaseWithTwoOffenses = () =>
  aCase({
    legalQualifications: [
      { legalQualificationId: ROBBERY.id, offenseDate: day('2025-01-10') },
      { legalQualificationId: HOMICIDE.id, offenseDate: day('2025-01-10') },
    ],
    legalQualificationRefs: [ROBBERY, HOMICIDE],
  });

function command(overrides: Partial<DeclareQualificationPrescriptionCommand> = {}): DeclareQualificationPrescriptionCommand {
  return {
    caseId: 1,
    legalQualificationId: ROBBERY.id,
    actor: anActor({ roleNames: ['ADMINISTRATOR'], lawyerId: null }),
    prescriptionDate: day('2026-09-15'),
    resolution: 'Auto N° 88',
    ...overrides,
  };
}

describe('DeclareQualificationPrescription', () => {
  let cases: FakeCaseRepository;
  let getCase: RecordingGetCase;
  let useCase: DeclareQualificationPrescription;

  beforeEach(() => {
    cases = new FakeCaseRepository(STATES_TABLE);
    getCase = new RecordingGetCase();
    useCase = new DeclareQualificationPrescription(
      cases,
      new FakeLegalParametersLookup(INITIAL_STATES, [], STATES_TABLE),
      new FakeClock(NOW, TODAY),
      getCase as unknown as GetCase,
    );
  });

  // CA-33.1, CA-33.4
  it('declara la calificación, la guarda una vez y devuelve el detalle; la causa sigue abierta', async () => {
    cases.add(aCaseWithTwoOffenses());

    const result = await useCase.execute(command());

    expect(cases.declaredPrescriptions).toHaveLength(1);
    const saved = cases.declaredPrescriptions[0] as CriminalCase;
    expect(saved.offenses.find((offense) => offense.legalQualificationId === ROBBERY.id)?.prescriptionDeclaration).not.toBeNull();
    expect(saved.currentStateId).not.toBe(PRESCRIBED.id);
    expect(getCase.requested).toEqual([1]);
    expect(result).toEqual({ id: 1 });
  });

  // CA-33.4: la última cierra la causa con el estado "Prescripta" del fuero.
  it('al declarar la última calificación, la causa pasa a "Prescripta"', async () => {
    cases.add(aCaseWithTwoOffenses());
    await useCase.execute(command());

    await useCase.execute(command({ legalQualificationId: HOMICIDE.id }));

    expect(cases.declaredPrescriptions.at(-1)?.currentStateId).toBe(PRESCRIBED.id);
  });

  // D-110 y el orden: 404 causa → 403 → 422 fuero → 404 calificación → 422 → 400.
  it.each([
    ['una causa inexistente, aunque pida la secretaría', { caseId: 999, actor: anActor({ roleNames: ['SECRETARY'], lawyerId: null }) }, CaseNotFoundError],
    ['la secretaría', { actor: anActor({ roleNames: ['SECRETARY'], lawyerId: null }) }, CannotDeclarePrescriptionError],
    ['un abogado que no es el responsable', { actor: anActor({ roleNames: ['LAWYER'], lawyerId: 99 }) }, NotResponsibleLawyerError],
    ['una calificación que la causa no registra, con datos inválidos', { legalQualificationId: 99, resolution: '' }, LegalQualificationNotInCaseError],
  ])('rechaza %s y no guarda nada', async (_name, overrides, error) => {
    cases.add(aCaseWithTwoOffenses());

    await expect(useCase.execute(command(overrides))).rejects.toThrow(error);
    expect(cases.declaredPrescriptions).toEqual([]);
  });

  it('el abogado que no es el responsable recibe el texto del contrato', async () => {
    cases.add(aCaseWithTwoOffenses());

    await expect(useCase.execute(command({ actor: anActor({ roleNames: ['LAWYER'], lawyerId: 99 }) }))).rejects.toThrow(
      'Solo el abogado responsable de la causa puede declarar la prescripción de sus calificaciones legales.',
    );
  });

  it('fuera del penal es PRESCRIPTION_NOT_APPLICABLE y no se guarda nada', async () => {
    cases.add(anAdministrativeCase());

    await expect(useCase.execute(command())).rejects.toThrow(PrescriptionNotApplicableError);
    expect(cases.declaredPrescriptions).toEqual([]);
  });

  // CA-33.8
  it('una calificación ya declarada no se vuelve a declarar y no se guarda otra vez', async () => {
    cases.add(aCaseWithTwoOffenses());
    await useCase.execute(command());

    await expect(useCase.execute(command())).rejects.toThrow(LegalQualificationAlreadyPrescribedError);
    expect(cases.declaredPrescriptions).toHaveLength(1);
  });
});
