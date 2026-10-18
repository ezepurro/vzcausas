import { RegisterClientCommand } from "../../../core/application/use-cases/register-client.use-case";
import { Client } from "../../../core/domain/entities/client.entity";
import { ClientResponseDto } from "../dtos/client.response.dto";
import { RegisterClientRequestDto } from "../dtos/register-client.request.dto";

/**
 * A client registered a moment ago is the client of no case (CA-8.8, RN1), so
 * the `0` of the `POST` response is a fact. The `GET`s of HU-9 do need the
 * real count, and they pass it in: until 10/10/2026 this constant answered
 * **every** response, which made the listing look right while being wrong.
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

  /**
   * `activeCases` is a parameter, not a constant: the caller knows. The
   * `GET`s pass the count that `cases` returned,
   * {@link toRegisteredResponse} the definitional zero.
   */
  static toResponse(client: Client, activeCases: number): ClientResponseDto {
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
    dto.activeCases = activeCases;
    dto.active = client.isActive();
    return dto;
  }

  /** Response of `POST /clients`: a brand new client has no cases yet. */
  static toRegisteredResponse(client: Client): ClientResponseDto {
    return this.toResponse(client, ACTIVE_CASES_ON_A_FRESH_CLIENT);
  }
}
