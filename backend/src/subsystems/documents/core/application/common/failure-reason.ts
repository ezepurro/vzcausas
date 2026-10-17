import { ValidationError } from '@shared/domain/domain-error';
import {
  DocumentStorageUnavailableError,
  InvalidCloudFolderError,
  StudioRootNotConfiguredError,
} from '../../domain/errors/documents.errors';
import { DocumentSpaceFailureReason } from '../../domain/ports/events/document-space-creation-failed.event';

/**
 * Classifies why creating a case's cloud space failed, so the event tells
 * `cases` what kind of problem it is without leaking provider details.
 */
export function classifyFailure(error: unknown): DocumentSpaceFailureReason {
  if (error instanceof DocumentStorageUnavailableError) {
    return error.reason;
  }
  if (error instanceof StudioRootNotConfiguredError) {
    return 'CONFIGURATION';
  }
  if (error instanceof InvalidCloudFolderError || error instanceof ValidationError) {
    return 'INVALID_DATA';
  }
  return 'INTERNAL';
}
