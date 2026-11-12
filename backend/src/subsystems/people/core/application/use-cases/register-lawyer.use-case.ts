import { Inject, Injectable } from "@nestjs/common";
import { Lawyer } from "../../domain/entities/lawyer.entity";
import { LawyerRegistrationAlreadyExistsError } from "../../domain/errors/people.errors";
import {
  LAWYER_REPOSITORY,
  LawyerRepository,
} from "../../domain/ports/lawyer.repository";
import { RegistrationNumber } from "../../domain/value-objects/registration-number.vo";

export type RegisterLawyerCommand = {
  lastName: string;
  firstName: string;
  /** Optional (D-107): left out, empty, blank or `null` means no registration number. */
  registrationNumber?: string | null;
};

export type RegisterLawyerResult = { lawyer: Lawyer };

/** HU12 — registers a new lawyer's professional record. */
@Injectable()
export class RegisterLawyerUseCase {
  constructor(
    @Inject(LAWYER_REPOSITORY) private readonly lawyers: LawyerRepository,
  ) {}

  async execute(command: RegisterLawyerCommand): Promise<RegisterLawyerResult> {
    const registrationNumber =
      command.registrationNumber == null ||
      command.registrationNumber.trim() === ""
        ? null
        : RegistrationNumber.create(command.registrationNumber);

    // Several lawyers can have none, so uniqueness is only checked when there is one.
    if (
      registrationNumber !== null &&
      (await this.lawyers.existsByRegistrationNumber(registrationNumber))
    ) {
      throw new LawyerRegistrationAlreadyExistsError();
    }

    const id = await this.lawyers.nextId();
    const lawyer = Lawyer.create({
      id,
      lastName: command.lastName,
      firstName: command.firstName,
      registrationNumber,
    });

    await this.lawyers.create(lawyer);

    return { lawyer };
  }
}
