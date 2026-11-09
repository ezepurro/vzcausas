/** `pagination` block of a paginated collection (API_CONTRACT_V2 §5.1). */
export class PaginationResponseDto {
  page!: number;
  limit!: number;
  totalItems!: number;
  totalPages!: number;
}
