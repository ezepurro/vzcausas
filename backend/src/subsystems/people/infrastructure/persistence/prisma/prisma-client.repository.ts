import { Injectable } from "@nestjs/common";
import { PrismaService } from "@shared/infrastructure/prisma/prisma.service";
import { Prisma } from "../../../../../generated/prisma/client";
import { Client } from "../../../core/domain/entities/client.entity";
import { ClientDniAlreadyExistsError } from "../../../core/domain/errors/people.errors";
import {
  ClientPage,
  ClientRepository,
  ClientSearchCriteria,
} from "../../../core/domain/ports/client.repository";
import { ClientDocument } from "../../../core/domain/value-objects/client-document.vo";
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
   * Mirrors the partial unique index `clients_document_active_key`: only
   * current clients are considered, so a logically deleted one
   * releases their document (CA-8.4), and the type is part of the key (D-108).
   */
  async existsActiveByDocument(document: ClientDocument, exceptClientId?: number): Promise<boolean> {
    const row = await this.prisma.db.client.findFirst({
      where: {
        documentType: document.type,
        documentNumber: document.number,
        active: true,
        ...(exceptClientId !== undefined && { id: { not: exceptClientId } }),
      },
      select: { id: true },
    });
    return row !== null;
  }

  async update(client: Client): Promise<void> {
    try {
      await this.prisma.db.client.update({
        where: { id: client.id },
        data: {
          lastName: client.lastName,
          firstName: client.firstName,
          documentType: client.document.type,
          documentNumber: client.document.number,
          address: client.address,
          phone: client.phone,
          email: client.email,
        },
      });
    } catch (error) {
      // Two requests checked the same document at once: the partial unique index decides (CA-10.7).
      if (
        error instanceof Prisma.PrismaClientKnownRequestError &&
        error.code === "P2002"
      ) {
        throw new ClientDniAlreadyExistsError();
      }
      throw error;
    }
  }

  async create(client: Client): Promise<void> {
    await this.prisma.db.client.create({
      data: {
        id: client.id,
        lastName: client.lastName,
        firstName: client.firstName,
        documentType: client.document.type,
        documentNumber: client.document.number,
        address: client.address,
        phone: client.phone,
        email: client.email,
        clientSince: client.clientSince,
        active: client.isActive(),
      },
    });
  }

  async saveDeactivation(client: Client): Promise<boolean> {
    const deactivation = client.deactivation;
    if (deactivation === null) {
      throw new Error(`The client ${client.id} has no deactivation to save.`);
    }
    const { count } = await this.prisma.db.client.updateMany({
      where: { id: client.id, active: true },
      data: {
        active: false,
        deactivatedAt: deactivation.deactivatedAt,
        deactivatedByUserId: deactivation.deactivatedByUserId,
        deactivationReason: deactivation.reason,
      },
    });
    return count === 1;
  }

  async findActiveById(id: number): Promise<Client | null> {
    const row = await this.prisma.db.client.findFirst({
      where: { id, active: true },
    });
    return row ? ClientPrismaMapper.toDomain(row) : null;
  }

  /**
   * Page and count run inside one `$transaction` so both observe the
   * same snapshot. Issued separately, a concurrent insert between them
   * could report a total that disagrees with the page — the kind of
   * drift that surfaces as a phantom empty last page.
   *
   * This is the one place that goes through `this.prisma` rather than
   * `this.prisma.db`: it opens its own read transaction, which the
   * transactional client deliberately cannot do. Safe because listing
   * is never called from inside a write transaction.
   *
   * `mode: "insensitive"` is what makes the search case-insensitive;
   * Postgres `LIKE` is not by default, so without it "gomez" would
   * miss "GÓMEZ". It does not fold accents, which is a known limit.
   */
  async search(criteria: ClientSearchCriteria): Promise<ClientPage> {
    const where = {
      active: true,
      ...(criteria.search
        ? {
            OR: [
              {
                lastName: {
                  contains: criteria.search,
                  mode: "insensitive" as const,
                },
              },
              {
                firstName: {
                  contains: criteria.search,
                  mode: "insensitive" as const,
                },
              },
              {
                documentNumber: {
                  contains: criteria.search,
                  mode: "insensitive" as const,
                },
              },
            ],
          }
        : {}),
    };

    const [rows, totalItems] = await this.prisma.$transaction([
      this.prisma.db.client.findMany({
        where,
        // El contrato fija este orden, y el indice
        // @@index([lastName, firstName]) lo sostiene.
        orderBy: [{ lastName: "asc" }, { firstName: "asc" }],
        skip: (criteria.page - 1) * criteria.limit,
        take: criteria.limit,
      }),
      this.prisma.db.client.count({ where }),
    ]);

    return { items: rows.map(ClientPrismaMapper.toDomain), totalItems };
  }
}
