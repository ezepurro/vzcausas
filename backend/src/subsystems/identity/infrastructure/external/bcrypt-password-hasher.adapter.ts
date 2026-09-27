import { Injectable } from "@nestjs/common";
import * as bcrypt from "bcryptjs";
import { PasswordHasher } from "../../core/domain/ports/password-hasher.port";

const DEFAULT_COST = 12;

/** bcrypt implementation of {@link PasswordHasher} (D-07 / D-13). */
@Injectable()
export class BcryptPasswordHasher implements PasswordHasher {
  private readonly cost = Number(process.env.BCRYPT_COST ?? DEFAULT_COST);

  async hash(plain: string): Promise<string> {
    return bcrypt.hash(plain, this.cost);
  }

  async verify(plain: string, hash: string): Promise<boolean> {
    return bcrypt.compare(plain, hash);
  }
}
