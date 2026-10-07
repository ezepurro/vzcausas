import { Injectable } from "@nestjs/common";
import { PrismaService } from "@shared/infrastructure/prisma/prisma.service";
import { Client } from "../../../core/domain/entities/client.entity";
import { ClientRepository } from "../../../core/domain/ports/client.repository";
import { Dni } from "../../../core/domain/value-objects/dni.vo";
import { ClientPrismaMapper } from "./client-prisma.mapper";

/**
 * Prisma-backed {@link ClientRepository} — the repository **of
 * `Client`**, not a repository of Prisma's own `PrismaClient`. The
 * name collides unfortunately; the order matches
 * `PrismaLawyerRepository` so the subsystem stays consistent.
 *
 * Every query goes through `prisma.db` rather than the service
 * itself: that accessor returns the open transaction's client when
 * there is one, and a write issued outside it would not roll back
 * with the rest.
 */
@Injectable()
export class PrismaClientRepository implements ClientRepository {
  constructor(private readonly prisma: PrismaService) {}

  async nextId(): Promise<number> {
    const [{ nextval }] = await this.prisma.db.$queryRaw<
      [{ nextval: bigint }]
    >`SELECT nextval(pg_get_serial_sequence('clients', 'id'))`;
    return Number(nextval);
  }

  /**
   * Mirrors the partial unique index `clients_dni_active_key`: only
   * current clients are considered, so a logically deleted one
   * releases their document (CA-8.4).
   */
  async existsActiveByDni(dni: Dni): Promise<boolean> {
    const row = await this.prisma.db.client.findFirst({
      where: { dni: dni.toString(), active: true },
      select: { id: true },
    });
    return row !== null;
  }

  async create(client: Client): Promise<void> {
    await this.prisma.db.client.create({
      data: {
        id: client.id,
        lastName: client.lastName,
        firstName: client.firstName,
        dni: client.dni.toString(),
        phone: client.phone,
        email: client.email,
        clientSince: client.clientSince,
        active: client.isActive(),
      },
    });
  }
}
