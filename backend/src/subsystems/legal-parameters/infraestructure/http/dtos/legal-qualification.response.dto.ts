import { PaginationResponseDto } from '../../../../../common/pagination/paginated-response.dto';

/**
 * Legal qualification as the `POST` returns it (contract §3.5).
 *
 * Without `activeCases`: the contract marks that field *"solo en las
 * respuestas de `GET`"*, and the criterion behind it is CA-48.7 — the
 * alta touches no case, so there is no count to report yet.
 */
export class RegisteredLegalQualificationResponseDto {
  id!: number;
  name!: string;
  prescriptionMonths!: number;
  active!: boolean;
}

/** Legal qualification as the two `GET`s return it (contract §3.5). */
export class LegalQualificationResponseDto extends RegisteredLegalQualificationResponseDto {
  activeCases!: number;
}

/** Body of `GET /legal-qualifications`. */
export class LegalQualificationsListResponseDto {
  data!: LegalQualificationResponseDto[];
  pagination!: PaginationResponseDto;
}
