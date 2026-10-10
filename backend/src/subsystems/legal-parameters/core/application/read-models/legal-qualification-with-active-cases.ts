import { LegalQualification } from '../../domain/entities/legal-qualification';

/**
 * A legal qualification as the `GET`s show it (contract §3.5): the entity plus
 * its `activeCases`. A read model, not an entity: `activeCases` is counted by
 * `cases` and is not part of what `legal-parameters` registers — which is why
 * the `POST` response does not carry it (CA-48.7).
 *
 * Mirrors `procedural-state-with-active-cases.ts`, for the same reason.
 */
export type LegalQualificationWithActiveCases = {
  qualification: LegalQualification;
  activeCases: number;
};
