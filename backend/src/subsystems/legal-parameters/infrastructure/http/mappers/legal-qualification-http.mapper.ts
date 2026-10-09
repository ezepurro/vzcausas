import { LegalQualification } from '@subsystems/legal-parameters/core/domain/entities/legal-qualification';
import { PaginatedResult } from '../../../../../common/pagination/paginated-result';
import {
  LegalQualificationResponseDto,
  LegalQualificationsListResponseDto,
  RegisteredLegalQualificationResponseDto,
} from '../dtos/legal-qualification.response.dto';

/** Translates domain legal qualifications into the API contract shape. */
export class LegalQualificationHttpMapper {
  /** Shape of the `POST` response: no `activeCases` (CA-48.7). */
  static toRegisteredResponse(
    qualification: LegalQualification,
  ): RegisteredLegalQualificationResponseDto {
    return {
      id: qualification.id,
      name: qualification.name,
      prescriptionMonths: qualification.prescriptionMonths,
      active: qualification.isActive,
    };
  }

  /**
   * Shape of the `GET` responses.
   *
   * **`activeCases` is hardcoded to 0 and CA-47.8 is therefore not
   * met.** The criterion asks for the active cases that register this
   * qualification, which means crossing `offenses` and `cases` — both
   * of the `cases` subsystem — and, worse, deciding what an active
   * case *is*: `cases.active` is the logical delete (RN12), not
   * "archivada"; the nearest thing to archivada is
   * `procedural_states.terminal`, unreachable through
   * `current_custom_state`; and prescription is per offence, so one
   * `offenses.prescription_date` may be past and another not.
   *
   * Deciding that here would plant the definition of an active case
   * inside `legal-parameters`, and the day `cases` defines it
   * differently this count would lie without anyone noticing. The
   * proper shape is a port that `CasesModule` exports, the way it
   * already exports `PROC_STATE_LOOKUP`. The other three resources
   * (clients, lawyers, procedural states) return 0 for the same
   * reason — see T-01 in `IMPLEMENTACION_PEOPLE.md`.
   */
  static toResponse(qualification: LegalQualification): LegalQualificationResponseDto {
    return {
      ...LegalQualificationHttpMapper.toRegisteredResponse(qualification),
      activeCases: 0,
    };
  }

  static toListResponse(
    result: PaginatedResult<LegalQualification>,
  ): LegalQualificationsListResponseDto {
    return {
      data: result.items.map((q) => LegalQualificationHttpMapper.toResponse(q)),
      pagination: {
        page: result.page,
        limit: result.limit,
        totalItems: result.total,
        totalPages: result.totalPages,
      },
    };
  }
}
