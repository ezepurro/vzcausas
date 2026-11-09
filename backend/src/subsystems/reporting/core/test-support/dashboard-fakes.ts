import { DashboardCaseRow, DashboardLawyerRef, LawyerDashboardQuery } from '../application/ports/lawyer-dashboard.query';

export const day = (iso: string) => new Date(`${iso}T00:00:00.000Z`);

export const RIOS: DashboardLawyerRef = { id: 2, lastName: 'Ríos', firstName: 'Malena' };

let nextCaseId = 1;

/** Call from `beforeEach` so `caseId`/`sacNumber` are stable and start at 1 in every test. */
export function resetCaseIds(): void {
  nextCaseId = 1;
}

export function aCase(overrides: Partial<DashboardCaseRow> = {}): DashboardCaseRow {
  const id = nextCaseId++;
  return {
    caseId: id,
    sacNumber: `1000000${id}`,
    caption: `Causa ${id}`,
    jurisdiction: 'CRIMINAL',
    currentStateName: 'Citación a juicio',
    dueDate: null,
    lastProceduralActDate: null,
    lastInterruptiveActDate: null,
    interruptiveActDates: [],
    offenses: [],
    responsibleLawyer: RIOS,
    ...overrides,
  };
}

/** Shared by HU41 and HU42's specs: both use cases read through the same port. */
export class FakeDashboardQuery implements LawyerDashboardQuery {
  cases: DashboardCaseRow[] = [];
  lawyer: DashboardLawyerRef | null = RIOS;
  lawyers: DashboardLawyerRef[] = [RIOS];
  askedFor: number[] = [];
  calledFindAllActiveCases = false;
  calledFindActiveLawyers = false;

  async findLawyer(): Promise<DashboardLawyerRef | null> {
    return this.lawyer;
  }

  async findActiveCasesOf(lawyerId: number): Promise<DashboardCaseRow[]> {
    this.askedFor.push(lawyerId);
    return this.cases;
  }

  async findActiveLawyers(): Promise<DashboardLawyerRef[]> {
    this.calledFindActiveLawyers = true;
    return this.lawyers;
  }

  async findAllActiveCases(): Promise<DashboardCaseRow[]> {
    this.calledFindAllActiveCases = true;
    return this.cases;
  }
}
