import { toIsoDate } from '@shared/infrastructure/http/iso-date';
import { RegisterCaseResult } from '../../../core/application/common/register-case.interfaces';
import { AdministrativeCase } from '../../../core/domain/entities/administrative';
import { Amparo } from '../../../core/domain/entities/amparo';
import { Case } from '../../../core/domain/entities/cases';
import { Offense } from '../../../core/domain/entities/offense';
import { ClientRef } from '../../../core/domain/ports/client-lookup.port';
import { LawyerRef } from '../../../core/domain/ports/lawyer-lookup.port';
import { CaseResponseDto } from '../dtos/case.response.dto';

/**
 * The current state of a case as the response needs it (contract §3.7).
 *
 * It is not `ProceduralStateRef`: that type exists for the write path —
 * "what `cases` needs to know about a procedural state to put a case in
 * it" — and carries only `id`, `name`, `isInitial` and `jurisdictionId`.
 * The response needs four more things it cannot supply: whether the state
 * is hand-written, the act that set it, that act's due date, and whether
 * the due date was adjusted by hand.
 *
 * `custom` and `proceduralStateId` are mutually exclusive by the schema's
 * CHECK (`num_nonnulls(current_state_id, current_custom_state) = 1`), so a
 * hand-written state arrives with `proceduralStateId` at `null`.
 */
export type CaseCurrentStateView = {
  proceduralStateId: number | null;
  name: string;
  custom: boolean;
  initial: boolean;
  proceduralActId: number | null;
  dueDate: Date | null;
  /** Computed per response against today's date in Córdoba. `null` when there is no due date. */
  businessDaysRemaining: number | null;
  manuallyAdjusted: boolean;
};

/**
 * Shape shared by every use case that hands back a case to render
 * (`RegisterCase`, `GetCase`, `ListCases`).
 *
 * The contract requires the listing and the detail to return the *same*
 * resource as the registration (§3.7: "Devuelve el mismo recurso que el
 * listado"). Having one input type, and one mapper over it, is what keeps
 * that true: if each endpoint built its own response, they would drift and
 * every one of them would still look correct in isolation.
 *
 * The client, the lawyer and the qualification names come from other
 * subsystems, resolved through this subsystem's lookup ports — the `Case`
 * aggregate holds only their identifiers.
 */
export type CaseView = {
  case: Case;
  client: ClientRef;
  responsibleLawyer: LawyerRef;
  /** Empty unless the case is criminal. */
  offenses: Offense[];
  currentState: CaseCurrentStateView;
};

/**
 * Builds the case resource of the API contract (§3.7).
 *
 * Extracted from `CasesController`, where it was a private method: the
 * listing (HU20) and the detail (HU22) have to produce the byte-identical
 * shape, so the mapping cannot live inside the endpoint that happened to
 * need it first.
 */
export class CaseHttpMapper {
  static toResponse(view: CaseView): CaseResponseDto {
    const { case: theCase, client, responsibleLawyer, currentState } = view;
    const hasCounterparty = theCase instanceof AdministrativeCase || theCase instanceof Amparo;

    return {
      id: theCase.id,
      sacNumber: theCase.sacNumber,
      caption: theCase.caption,
      court: theCase.court,
      jurisdiction: theCase.jurisdictionCode,
      proceduralRole: theCase.proceduralRole,
      instructorName: theCase.instructor.name,
      tribunalPhone: theCase.instructor.phone,
      instructorExtension: theCase.instructor.extension,
      counterparty: hasCounterparty ? theCase.counterparty : null,
      subjectMatter: hasCounterparty ? theCase.subjectMatter : null,
      client: { ...client, clientSince: toIsoDate(client.clientSince) },
      responsibleLawyer,
      legalQualifications: view.offenses.map((offense) => ({
        id: offense.legalQualificationId,
        name: offense.legalQualificationName,
        prescriptionMonths: offense.prescriptionMonths,
        offenseDate: toIsoDate(offense.offenseDate),
        prescriptionStartsOn: toIsoDate(offense.prescriptionStartsOn),
        prescriptionExpiresOn: offense.prescriptionExpiresOn && toIsoDate(offense.prescriptionExpiresOn),
      })),
      startDate: toIsoDate(theCase.startDate),
      currentState: {
        proceduralStateId: currentState.proceduralStateId,
        name: currentState.name,
        custom: currentState.custom,
        initial: currentState.initial,
        proceduralActId: currentState.proceduralActId,
        dueDate: currentState.dueDate && toIsoDate(currentState.dueDate),
        businessDaysRemaining: currentState.businessDaysRemaining,
        manuallyAdjusted: currentState.manuallyAdjusted,
      },
      active: theCase.active,
    };
  }

  /**
   * Response for `POST /cases` (HU18).
   *
   * A freshly registered case is always in the initial state of its
   * jurisdiction, and the initial state is not set by any act: it opens no
   * deadline and is never hand-written. That is why the four act-derived
   * fields are empty here rather than read from anywhere — it is a property
   * of registration, not a gap. Keeping it in this method, instead of in
   * `toResponse`, is what stops the listing from inheriting the same nulls.
   */
  static fromRegisterResult(result: RegisterCaseResult): CaseResponseDto {
    const { currentState } = result;

    return CaseHttpMapper.toResponse({
      case: result.newCase,
      client: result.client,
      responsibleLawyer: result.responsibleLawyer,
      offenses: result.offenses,
      currentState: {
        proceduralStateId: currentState.isInitial ? null : currentState.id,
        name: currentState.name,
        custom: false,
        initial: currentState.isInitial,
        proceduralActId: null,
        dueDate: null,
        businessDaysRemaining: null,
        manuallyAdjusted: false,
      },
    });
  }
}
