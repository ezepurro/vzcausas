import { Lawyer } from "../../../core/domain/entities/lawyer.entity";
import { RegistrationNumber } from "../../../core/domain/value-objects/registration-number.vo";

/**
 * Prisma row shape this mapper expects for `lawyers`, WRITTEN
 * AGAINST THE INTENDED SCHEMA — which does not exist yet.
 *
 * `schema.prisma` currently has **no `Lawyer` model at all**: the
 * `people` subsystem's table still has to be added, as part of the
 * same pending team decision that covers `identity`'s id types and
 * its missing `username`/`lawyerId` columns.
 *
 * Expected model, for whoever applies it:
 *
 * ```prisma
 * model Lawyer {
 *   id                 Int      @id @default(autoincrement())
 *   fullName           String   @map("full_name") @db.VarChar(255)
 *   registrationNumber String   @unique @map("registration_number") @db.VarChar(50)
 *   active             Boolean  @default(true)
 *   createdAt          DateTime @default(now()) @map("created_at") @db.Timestamptz(6)
 *   @@map("lawyers")
 * }
 * ```
 *
 * Until then this file and `prisma-lawyer.repository.ts` cannot
 * type-check against the generated client. Everything upstream
 * (domain, use cases, specs, HTTP layer) is independent of that.
 */
type LawyerRow = {
  id: number;
  fullName: string;
  registrationNumber: string;
  active: boolean;
};

export class LawyerPrismaMapper {
  static toDomain(row: LawyerRow): Lawyer {
    return Lawyer.hydrate({
      id: row.id,
      fullName: row.fullName,
      registrationNumber: RegistrationNumber.create(row.registrationNumber),
      active: row.active,
    });
  }
}
