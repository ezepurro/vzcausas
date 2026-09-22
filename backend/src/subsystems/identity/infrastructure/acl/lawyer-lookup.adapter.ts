import { Injectable } from "@nestjs/common";
import { LawyerLookupPort } from "../../core/domain/ports/lawyer-lookup.port";

/**
 * Temporary implementation of {@link LawyerLookupPort}. The `people`
 * subsystem (owner of `Lawyer`, HU-12) does not exist yet, so there is
 * nothing real to query — every id resolves to "not found".
 *
 * Effect: `RegisterUser` (HU4) can fully register users with the
 * `ADMINISTRATOR`/`SECRETARY` roles today; a `LAWYER` registration
 * will always fail with `LawyerNotFoundError` until this adapter is
 * replaced.
 *
 * TODO(HU-12): once `people` exists, replace this with an adapter
 * that calls its `FindLawyer`-style use case and delete this file.
 */
@Injectable()
export class StubLawyerLookupAdapter implements LawyerLookupPort {
  async existsById(_lawyerId: number): Promise<boolean> {
    return false;
  }
}
