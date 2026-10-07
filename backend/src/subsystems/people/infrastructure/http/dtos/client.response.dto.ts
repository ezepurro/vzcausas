/** Response body for the client resource (API contract §3.6). */
export class ClientResponseDto {
  id!: number;
  lastName!: string;
  firstName!: string;
  dni!: string;
  phone!: string | null;
  email!: string | null;
  /** Civil date, `YYYY-MM-DD` — not an instant. */
  clientSince!: string;
  activeCases!: number;
  active!: boolean;
}
