import { Lawyer } from "../../../core/domain/entities/lawyer.entity";
import { RegistrationNumber } from "../../../core/domain/value-objects/registration-number.vo";

/**
 * Prisma row shape for `lawyers`.
 *
 * The model this file used to describe as missing now exists in
 * `schema.prisma` with its migration applied, so this mapper and
 * `prisma-lawyer.repository.ts` type-check against the generated
 * client and neither needs a `@ts-nocheck` any more.
 */
type LawyerRow = {
  id: number;
  lastName: string;
  firstName: string;
  registrationNumber: string;
  active: boolean;
};

export class LawyerPrismaMapper {
  static toDomain(row: LawyerRow): Lawyer {
    return Lawyer.hydrate({
      id: row.id,
      lastName: row.lastName,
      firstName: row.firstName,
      registrationNumber: RegistrationNumber.create(row.registrationNumber),
      active: row.active,
    });
  }
}
