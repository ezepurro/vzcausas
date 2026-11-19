import { NotFoundError, ValidationError } from '@shared/domain/domain-error';

/**
 * `period` is not `AAAA-MM` (§3.13, `400`). The contract answers with
 * `INVALID_REQUEST` and the parameter in `details`, not with the pipe's generic
 * `VALIDATION_ERROR`, so it is raised by the value object and not by a DTO.
 */
export class InvalidReportPeriodError extends ValidationError {
  constructor() {
    super('INVALID_REQUEST', 'Parámetros de query inválidos.', {
      period: 'Debe tener el formato AAAA-MM.',
    });
  }
}

/** `disposition` of `GET /reports/monthly/file` is neither `inline` nor `attachment` (§3.13, `400`). */
export class InvalidReportDispositionError extends ValidationError {
  constructor() {
    super('INVALID_REQUEST', 'Parámetros de query inválidos.', {
      disposition: 'Debe ser inline o attachment.',
    });
  }
}

/** The period is before `availableFrom` or after the current month (§3.13, `404`). */
export class MonthlyReportNotFoundError extends NotFoundError {
  constructor() {
    super('MONTHLY_REPORT_NOT_FOUND', 'No hay reporte para ese período.');
  }
}
