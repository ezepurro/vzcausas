import { Injectable } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import * as bcrypt from "bcryptjs";
import { PasswordHasher } from "@subsystems/identity/core/domain/ports/password-hasher.port";

const MIN_COST = 4;
const MAX_COST = 15;

/**
 * Production {@link PasswordHasher} implementation backed by
 * `bcryptjs` (D-13: pure-JS avoids native `bcrypt`'s vulnerable
 * dependency chain and eliminates the Windows build-tools
 * requirement, at negligible cost since `BCRYPT_COST` dominates
 * hash time regardless of the underlying library).
 *
 * The cost factor is read from the `BCRYPT_COST` environment
 * variable at construction time (D-07/D-39) and the constructor
 * refuses to boot with a value outside `[4, 15]`. The bcrypt
 * spec's lower bound is 4; anything below is trivially brute
 * forceable. Values above 15 push a single hash past a second on
 * modern hardware and turn the login endpoint into a DoS vector.
 */
@Injectable()
export class BcryptPasswordHasherAdapter implements PasswordHasher {
  private readonly cost: number;

  constructor(config: ConfigService) {
    // getOrThrow: BCRYPT_COST is listed as mandatory in the
    // bitácora §6. Fail-fast at bootstrap rather than mint hashes
    // under a silent default (D-39).
    const raw = config.getOrThrow<number | string>("BCRYPT_COST");
    const cost = typeof raw === "string" ? Number.parseInt(raw, 10) : raw;

    if (!Number.isInteger(cost) || cost < MIN_COST || cost > MAX_COST) {
      throw new Error(
        `BCRYPT_COST must be an integer between ${MIN_COST} and ${MAX_COST}, got ${String(raw)}`,
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
