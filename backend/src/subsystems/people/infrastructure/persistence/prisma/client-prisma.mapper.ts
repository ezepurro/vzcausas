import { Client } from "../../../core/domain/entities/client.entity";
import { Deactivation } from "@shared/domain/deactivation.vo";
import {
  ClientDocument,
  DocumentType,
} from "../../../core/domain/value-objects/client-document.vo";

/** Prisma row shape for `clients`. */
type ClientRow = {
  id: number;
  lastName: string;
  firstName: string;
  documentType: DocumentType;
  documentNumber: string;
  address: string;
  phone: string;
  email: string | null;
  clientSince: Date;
  active: boolean;
  deactivatedAt: Date | null;
  deactivatedByUserId: number | null;
  deactivationReason: string | null;
};

export class ClientPrismaMapper {
  static toDomain(row: ClientRow): Client {
    return Client.hydrate({
      id: row.id,
      lastName: row.lastName,
      firstName: row.firstName,
      // Safe to rebuild without re-validating: the column carries a
      // CHECK (`ck_clients_document_format`) that enforces the same shape
      // the value object does.
      document: ClientDocument.create(row.documentType, row.documentNumber),
      address: row.address,
      phone: row.phone,
      email: row.email,
      clientSince: row.clientSince,
      active: row.active,
      deactivation: ClientPrismaMapper.toDeactivation(row),
    });
  }

  /**
   * The record of the baja from its columns (HU11), or `null` while the client
   * is in force. `ck_clients_deactivation_coherent` keeps them together with
   * `active`, so a baja without who and when is corrupt data.
   */
  private static toDeactivation(row: ClientRow): Deactivation | null {
    if (row.active) {
      return null;
    }
    if (row.deactivatedAt === null || row.deactivatedByUserId === null) {
      throw new Error(`Client ${row.id} is given de baja but its deactivation record is incomplete.`);
    }
    return Deactivation.hydrate({
      reason: row.deactivationReason,
      deactivatedByUserId: row.deactivatedByUserId,
      deactivatedAt: row.deactivatedAt,
    });
  }
}
