import { Client } from "../../../core/domain/entities/client.entity";
import { Dni } from "../../../core/domain/value-objects/dni.vo";

/** Prisma row shape for `clients`. */
type ClientRow = {
  id: number;
  lastName: string;
  firstName: string;
  dni: string;
  phone: string | null;
  email: string | null;
  clientSince: Date;
  active: boolean;
};

export class ClientPrismaMapper {
  static toDomain(row: ClientRow): Client {
    return Client.hydrate({
      id: row.id,
      lastName: row.lastName,
      firstName: row.firstName,
      // Safe to rebuild without re-validating: the column carries a
      // CHECK (`ck_clients_dni_format`) that enforces the same shape
      // the value object does.
      dni: Dni.create(row.dni),
      phone: row.phone,
      email: row.email,
      clientSince: row.clientSince,
      active: row.active,
    });
  }
}
