import { toIsoDate } from '@shared/infrastructure/http/iso-date';
import { LawyerDashboardView } from '../../../core/application/use-cases/get-lawyer-dashboard.use-case';
import { LawyerDashboardResponseDto } from '../dtos/lawyer-dashboard.response.dto';

/** The dashboard's view to the contract's shape: only dates change, to `YYYY-MM-DD`. */
export class LawyerDashboardHttpMapper {
  static toResponse(view: LawyerDashboardView): LawyerDashboardResponseDto {
    return {
      date: toIsoDate(view.date),
      lawyer: view.lawyer,
      summary: view.summary,
      deadlines: view.deadlines.map((deadline) => ({ ...deadline, dueDate: toIsoDate(deadline.dueDate) })),
      prescriptionAlerts: view.prescriptionAlerts.map((alert) => ({
        ...alert,
        startsOn: toIsoDate(alert.startsOn),
        expiresOn: toIsoDate(alert.expiresOn),
      })),
      casesToAdvance: view.casesToAdvance.map((item) => ({
        ...item,
        lastActDate: item.lastActDate && toIsoDate(item.lastActDate),
      })),
    };
  }
}
