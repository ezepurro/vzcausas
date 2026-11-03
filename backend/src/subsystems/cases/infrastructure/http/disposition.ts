import { Disposition } from '@shared/infrastructure/http/content-disposition';
import { InvalidCoverDispositionError } from '../../core/domain/errors/case.errors';

const DISPOSITIONS: readonly Disposition[] = ['inline', 'attachment'];

/**
 * The `disposition` query parameter of the files `cases` hands out: the cover
 * sheet (HU24) and the documents of the case (HU38). Absent, it takes the
 * endpoint's default (`inline` for the cover, `attachment` for a document);
 * anything else that is not one of the two is a 400.
 *
 * Both answer with `InvalidCoverDispositionError`: the contract gives the
 * documents no response of their own, so they take the cover's (V5
 * `:4627-4638`). Its name says "Cover"; renaming it is a refactor apart.
 */
export function parseDisposition(raw: unknown, fallback: Disposition): Disposition {
  if (raw === undefined) {
    return fallback;
  }
  if (!DISPOSITIONS.includes(raw as Disposition)) {
    throw new InvalidCoverDispositionError();
  }
  return raw as Disposition;
}
