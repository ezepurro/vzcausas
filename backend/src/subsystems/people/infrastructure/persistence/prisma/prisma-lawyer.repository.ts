// @ts-nocheck — the `lawyers` table does not exist in schema.prisma
// yet (see the expected model in lawyer-prisma.mapper.ts). Without
// this, Nest's watch-mode compiler refuses to boot the ENTIRE app,
// which would break local dev for everyone on this branch. Remove it
// once the team adds the model and regenerates the Prisma client.
import { Injectable } from "@nestjs/common";
import { PrismaService } from "@shared/infrastructure/prisma/prisma.service";
import { Lawyer } from "../../../core/domain/entities/lawyer.entity";
import { LawyerRepository } from "../../../core/domain/ports/lawyer.repository";
import { RegistrationNumber } from "../../../core/domain/value-objects/registration-number.vo";
import { LawyerPrismaMapper } from "./lawyer-prisma.mapper";

@Injectable()
export class PrismaLawyerRepository implements LawyerRepository {
  constructor(private readonly prisma: PrismaService) {}

  async nextId(): Promise<number> {
    const [{ nextval }] = await this.prisma.$queryRaw<
      [{ nextval: bigint }]
    >`SELECT nextval(pg_get_serial_sequence('lawyers', 'id'))`;
    return Number(nextval);
  }

  async existsByRegistrationNumber(
    registrationNumber: RegistrationNumber,
  ): Promise<boolean> {
    const row = await this.prisma.lawyer.findUnique({
      where: { registrationNumber: registrationNumber.toString() },
      select: { id: true },
    });
    return row !== null;
  }

  async create(lawyer: Lawyer): Promise<void> {
    await this.prisma.lawyer.create({
      data: {
        id: lawyer.id,
        fullName: lawyer.fullName,
        registrationNumber: lawyer.registrationNumber.toString(),
        active: lawyer.isActive(),
      },
    });
  }

  async findById(id: number): Promise<Lawyer | null> {
    const row = await this.prisma.lawyer.findUnique({ where: { id } });
    return row ? LawyerPrismaMapper.toDomain(row) : null;
  }
}
