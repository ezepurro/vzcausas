import { Client } from "../../../core/domain/entities/client.entity";
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
    });
  }
}
