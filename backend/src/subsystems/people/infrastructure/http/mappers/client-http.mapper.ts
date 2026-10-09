import { RegisterClientCommand } from "../../../core/application/use-cases/register-client.use-case";
import { Client } from "../../../core/domain/entities/client.entity";
import { ClientResponseDto } from "../dtos/client.response.dto";
import { RegisterClientRequestDto } from "../dtos/register-client.request.dto";

/**
 * `activeCases` counts the cases this client is the client of. That
 * lives in the `cases` subsystem, and a client registered a moment
 * ago necessarily has none (CA-8.8, RN1). The field ships from day
 * one so the resource's shape never has to change; HU-9's listing is
 * what will need the real count.
 */
const ACTIVE_CASES_ON_A_FRESH_CLIENT = 0;

export class ClientHttpMapper {
  static toRegisterCommand(
    dto: RegisterClientRequestDto,
  ): RegisterClientCommand {
    return {
      lastName: dto.lastName,
      firstName: dto.firstName,
      dni: dto.dni,
      phone: dto.phone ?? null,
      email: dto.email ?? null,
    };
  }

  static toResponse(client: Client): ClientResponseDto {
    const dto = new ClientResponseDto();
    dto.id = client.id;
    dto.lastName = client.lastName;
    dto.firstName = client.firstName;
    dto.dni = client.dni.toString();
    dto.phone = client.phone;
    dto.email = client.email;
    // Rendered as the `YYYY-MM-DD` civil date the contract shows, not
    // as a full ISO instant: `clientSince` is a day, and serializing
    // it with a time would invite the reader to care about a timezone
    // that carries no meaning here.
    dto.clientSince = client.clientSince.toISOString().slice(0, 10);
    dto.activeCases = ACTIVE_CASES_ON_A_FRESH_CLIENT;
    dto.active = client.isActive();
    return dto;
  }
}
