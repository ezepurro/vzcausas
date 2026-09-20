export interface AuthenticateUser {
  readonly userId: number;
  readonly roleName: string;
  readonly lawyerId: number | null;
  readonly permissions: readonly string[];
}
