import {
  DeadlineDetectionPort,
} from '../../../src/subsystems/deadlines/core/domain/ports/deadline-detection.port';
import {
  PrescriptionDetectionPort,
} from '../../../src/subsystems/deadlines/core/domain/ports/prescription-detection.port';
import {
  PrescriptionNotice,
  UpcomingDeadlineNotice,
} from '../../../src/subsystems/deadlines/core/domain/types/upcoming-deadline-notice';

/**
 * Fakes controlables de los puertos TEMPORALES `DEADLINE_DETECTION` /
 * `PRESCRIPTION_DETECTION` (TN-03, `deadline-detection.port.ts`). El binding
 * real en `deadlines.module.ts` siempre devuelve `[]` — correcto para
 * producción (HU51/HU52 no existen todavía), pero un test de integración que
 * quiera ejercitar el digest completo necesita notices de verdad. Se
 * reemplazan vía `overrideProvider`, igual que `EMAIL_SENDER`.
 *
 * **Borrar junto con `deadline-detection.port.ts` / `prescription-detection.port.ts`**
 * cuando HU51/HU52 reemplacen el seam (ver nota en esos archivos) — en ese
 * momento el spec de integración pasa a sembrar datos reales de causas y
 * dejar que la detección real los encuentre, no a inyectar esta lista.
 */
export class FakeDeadlineDetection implements DeadlineDetectionPort {
  notices: UpcomingDeadlineNotice[] = [];

  async execute(): Promise<UpcomingDeadlineNotice[]> {
    return this.notices;
  }
}

export class FakePrescriptionDetection implements PrescriptionDetectionPort {
  notices: PrescriptionNotice[] = [];

  async execute(): Promise<PrescriptionNotice[]> {
    return this.notices;
  }
}
