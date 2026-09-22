import { Injectable } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import * as bcrypt from "bcryptjs";
import { PasswordHasher } from "@subsystems/identity/core/domain/ports/password-hasher.port";

const MIN_COST = 4;
const MAX_COST = 15;

@Injectable()
export class BcryptPasswordHasherAdapter implements PasswordHasher {
  private readonly cost: number;

  constructor(config: ConfigService) {
    const raw = config.getOrThrow<number | string>("BCRYPT_COST");
    const cost = typeof raw === "string" ? Number.parseInt(raw, 10) : raw;

    if (!Number.isInteger(cost) || cost < MIN_COST || cost > MAX_COST) {
      throw new Error(
        `BCRYPT_COST must be an integer between ${MIN_COST} and ${MAX_COST} got ${String(raw)}`,
      );
    }

    this.cost = cost;
  }

  hash(plain: string): Promise<string> {
    return bcrypt.hash(plain, this.cost);
  }

  verify(plain: string, hash: string): Promise<boolean> {
    return bcrypt.compare(plain, hash);
  }
}
