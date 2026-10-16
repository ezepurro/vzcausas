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
  registrationNumber: string;
};

export type RegisterLawyerResult = { lawyer: Lawyer };

/** HU12 — registers a new lawyer's professional record. */
@Injectable()
export class RegisterLawyerUseCase {
  constructor(
    @Inject(LAWYER_REPOSITORY) private readonly lawyers: LawyerRepository,
  ) {}

  async execute(command: RegisterLawyerCommand): Promise<RegisterLawyerResult> {
    const registrationNumber = RegistrationNumber.create(
      command.registrationNumber,
    );

    if (await this.lawyers.existsByRegistrationNumber(registrationNumber)) {
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
