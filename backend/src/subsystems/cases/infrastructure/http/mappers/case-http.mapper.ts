import { toIsoDate } from '@shared/infrastructure/http/iso-date';
import { RegisterCaseResult } from '../../../core/application/common/register-case.interfaces';
import { AdministrativeCase } from '../../../core/domain/entities/administrative';
import { Amparo } from '../../../core/domain/entities/amparo';
import { CaseListItem } from '../../../core/domain/ports/case-query.port';
import { CaseResponseDto } from '../dtos/case.response.dto';

/**
 * Builds the case resource of the API contract (§3.7).
 *
 * One function over one type: `toResponse` takes a {@link CaseListItem} and
 * every endpoint goes through it — the listing (HU20), the detail (HU22) and
 * the registration (HU18). The contract requires the three to return the
 * same resource, and that is the only reason this class exists outside
 * `CasesController`, where it started as a private method.
 *
 * `toResponse` holds **no** domain types. That is what lets the listing feed
 * it a flat row projected by one SQL query: an `instanceof` check here would
 * force every reader to rebuild the aggregate first, and a page of 20 cases
 * would cost about a hundred queries.
 */
export class CaseHttpMapper {
  static toResponse(item: CaseListItem): CaseResponseDto {
    return {
      id: item.id,
      sacNumber: item.sacNumber,
      caption: item.caption,
      court: item.court,
      jurisdiction: item.jurisdiction,
      proceduralRole: item.proceduralRole,
      instructorName: item.instructorName,
      tribunalPhone: item.tribunalPhone,
      instructorExtension: item.instructorExtension,
      counterparty: item.counterparty,
      subjectMatter: item.subjectMatter,
      client: { ...item.client, clientSince: toIsoDate(item.client.clientSince) },
      responsibleLawyer: item.responsibleLawyer,
      legalQualifications: item.legalQualifications.map((qualification) => ({
        id: qualification.id,
        name: qualification.name,
        prescriptionMonths: qualification.prescriptionMonths,
        offenseDate: toIsoDate(qualification.offenseDate),
        prescriptionStartsOn: toIsoDate(qualification.prescriptionStartsOn),
        prescriptionExpiresOn:
          qualification.prescriptionExpiresOn && toIsoDate(qualification.prescriptionExpiresOn),
      })),
      startDate: toIsoDate(item.startDate),
      currentState: {
        proceduralStateId: item.currentState.proceduralStateId,
        name: item.currentState.name,
        custom: item.currentState.custom,
        initial: item.currentState.initial,
        proceduralActId: item.currentState.proceduralActId,
        dueDate: item.currentState.dueDate && toIsoDate(item.currentState.dueDate),
        businessDaysRemaining: item.currentState.businessDaysRemaining,
        manuallyAdjusted: item.currentState.manuallyAdjusted,
      },
      active: item.active,
    };
  }

  /**
   * Response for `POST /cases` (HU18): projects the aggregate the use case
   * just built into a {@link CaseListItem}, then maps it.
   *
   * This is the only place that holds a `Case`, so it is the only place that
   * asks what kind of case it is. `counterparty` and `subjectMatter` exist
   * only on `ADMINISTRATIVE` and `AMPARO`; in `CRIMINAL` the contract wants
   * `null`.
   *
   * The four act-derived fields of `currentState` are empty here, and that is
   * a property of registration rather than a gap: a fresh case is in the
   * initial state of its jurisdiction, no act set it, so it opens no deadline
   * and is never hand-written. `proceduralStateId` goes out as `null` even
   * though `cases.current_state_id` points at the real "Iniciada" row —
   * mapping that id through would send the frontend looking for a state that
   * `/procedural-states` does not list.
   */
  static fromRegisterResult(result: RegisterCaseResult): CaseResponseDto {
    const { newCase, currentState } = result;
    const hasCounterparty = newCase instanceof AdministrativeCase || newCase instanceof Amparo;

    return CaseHttpMapper.toResponse({
      id: newCase.id,
      sacNumber: newCase.sacNumber,
      caption: newCase.caption,
      court: newCase.court,
      jurisdiction: newCase.jurisdictionCode,
      proceduralRole: newCase.proceduralRole,
      instructorName: newCase.instructor.name,
      tribunalPhone: newCase.instructor.phone,
      instructorExtension: newCase.instructor.extension,
      counterparty: hasCounterparty ? newCase.counterparty : null,
      subjectMatter: hasCounterparty ? newCase.subjectMatter : null,
      client: result.client,
      responsibleLawyer: result.responsibleLawyer,
      legalQualifications: result.offenses.map((offense) => ({
        id: offense.legalQualificationId,
        name: offense.legalQualificationName,
        prescriptionMonths: offense.prescriptionMonths,
        offenseDate: offense.offenseDate,
        prescriptionStartsOn: offense.prescriptionStartsOn,
        prescriptionExpiresOn: offense.prescriptionExpiresOn,
      })),
      startDate: newCase.startDate,
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
      active: newCase.active,
    });
  }
}
