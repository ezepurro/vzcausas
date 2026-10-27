import { LegalQualificationWithActiveCases } from '@subsystems/legal-parameters/core/application/read-models/legal-qualification-with-active-cases';
import { LegalQualification } from '@subsystems/legal-parameters/core/domain/entities/legal-qualification';
import { PaginatedResult } from '@shared/domain/paginated-result';
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
   * Shape of the `GET` responses, with the real `activeCases` (CA-47.8).
   *
   * It used to be hardcoded to `0`, because counting means crossing
   * `offenses` and `cases` and, before that, deciding what an active case
   * *is* — and deciding it here would have planted that definition inside
   * `legal-parameters`, where the day `cases` defined it differently the
   * count would have lied without anyone noticing.
   *
   * That is now settled the right way round: `cases` owns the definition (§4)
   * and counts, `legal-parameters` asks through `ActiveCasesCounterPort`, and
   * the number arrives already counted in
   * {@link LegalQualificationWithActiveCases}. Two answers the old note left
   * open: a case in a hand-written state **is** active and counts here, and
   * prescription does not enter the predicate at all.
   */
  static toResponse(counted: LegalQualificationWithActiveCases): LegalQualificationResponseDto {
    return {
      ...LegalQualificationHttpMapper.toRegisteredResponse(counted.qualification),
      activeCases: counted.activeCases,
    };
  }

  static toListResponse(
    result: PaginatedResult<LegalQualificationWithActiveCases>,
  ): LegalQualificationsListResponseDto {
    return {
      data: result.items.map((item) => LegalQualificationHttpMapper.toResponse(item)),
      pagination: {
        page: result.page,
        limit: result.limit,
        totalItems: result.total,
        totalPages: result.totalPages,
      },
    };
  }
}
