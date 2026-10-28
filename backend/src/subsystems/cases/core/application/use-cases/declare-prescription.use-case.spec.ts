import {
  CannotDeclarePrescriptionError,
  CaseInTerminalStateError,
  CaseNotFoundError,
  PrescriptionNotApplicableError,
} from '../../domain/errors/case.errors';
import { CaseListItem } from '../../domain/ports/case.repository';
import { FakeCaseRepository, FakeClock, FakeLegalParametersLookup } from '../../test-support/case-fakes';
import {
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
} from '../../test-support/case-fixtures';
import { DeclarePrescription, DeclarePrescriptionCommand } from './declare-prescription.use-case';
import { GetCase } from './get-case.use-case';

/** HU33 — `POST /cases/{caseId}/prescription` (contract V4 §3.7). */

/** Stands for the detail: records which case it was asked for. */
class RecordingGetCase {
  readonly requested: number[] = [];

  async execute(query: { id: number }): Promise<CaseListItem> {
    this.requested.push(query.id);
    return { id: query.id } as CaseListItem;
  }
}

const aCriminalCaseWithOffense = () =>
  aCase({
    legalQualifications: [{ legalQualificationId: ROBBERY.id, offenseDate: day('2025-01-10') }],
    legalQualificationRefs: [ROBBERY],
  });

function command(overrides: Partial<DeclarePrescriptionCommand> = {}): DeclarePrescriptionCommand {
  return {
    caseId: 1,
    actor: anActor({ roleNames: ['ADMINISTRATOR'], lawyerId: null }),
    prescriptionDate: day('2026-09-15'),
    resolution: 'Sentencia N° 214 del Juzgado de Control N° 3',
    ...overrides,
  };
}

describe('DeclarePrescription', () => {
  let cases: FakeCaseRepository;
  let getCase: RecordingGetCase;
  let useCase: DeclarePrescription;

  beforeEach(() => {
    cases = new FakeCaseRepository(STATES_TABLE);
    getCase = new RecordingGetCase();
    useCase = new DeclarePrescription(
      cases,
      new FakeLegalParametersLookup(INITIAL_STATES, [], STATES_TABLE),
      new FakeClock(NOW, TODAY),
      getCase as unknown as GetCase,
    );
  });

  it('marca la causa, la guarda una vez y devuelve el detalle de la causa (CA-33.1, D-54)', async () => {
    cases.add(aCriminalCaseWithOffense());

    const result = await useCase.execute(command());

    expect(cases.declaredPrescriptions).toHaveLength(1);
    expect(cases.declaredPrescriptions[0].currentStateId).toBe(PRESCRIBED.id);
    expect(getCase.requested).toEqual([1]);
    expect(result).toEqual({ id: 1 });
  });

  it('la secretaría no puede, y se rechaza antes de leer la causa (CA-33.2)', async () => {
    const attempt = useCase.execute(command({ caseId: 999, actor: anActor({ roleNames: ['SECRETARY'], lawyerId: null }) }));

    // A 403, not the 404 of the missing case: who asks is checked first.
    await expect(attempt).rejects.toThrow(CannotDeclarePrescriptionError);
    expect(cases.declaredPrescriptions).toEqual([]);
  });

  // The case given de baja is covered by the integration spec (D2.3): the fixtures only build active cases.
  it('una causa que no existe responde CASE_NOT_FOUND (CA-33.11)', async () => {
    await expect(useCase.execute(command())).rejects.toThrow(CaseNotFoundError);
    expect(cases.declaredPrescriptions).toEqual([]);
  });

  it('una causa que no es penal no se marca y no se guarda nada (CA-33.9)', async () => {
    cases.add(anAdministrativeCase());

    await expect(useCase.execute(command())).rejects.toThrow(PrescriptionNotApplicableError);
    expect(cases.declaredPrescriptions).toEqual([]);
    expect(getCase.requested).toEqual([]);
  });

  it('si otra marca ganó entre la lectura y la escritura, responde CASE_IN_TERMINAL_STATE', async () => {
    cases.add(aCriminalCaseWithOffense());
    cases.prescriptionAlreadyDeclaredOnSave = true;

    await expect(useCase.execute(command())).rejects.toThrow(CaseInTerminalStateError);
    expect(getCase.requested).toEqual([]);
  });

  it('sin el estado "Prescripta" del fuero penal falla como dato roto, no como error del usuario', async () => {
    cases.add(aCriminalCaseWithOffense());
    const withoutPrescribed = new DeclarePrescription(
      cases,
      new FakeLegalParametersLookup(INITIAL_STATES, [], STATES_TABLE.filter((state) => !state.isPrescribed)),
      new FakeClock(NOW, TODAY),
      getCase as unknown as GetCase,
    );

    await expect(withoutPrescribed.execute(command())).rejects.toThrow(/no "Prescripta" state/);
    expect(cases.declaredPrescriptions).toEqual([]);
  });
});
