import { toIsoDate } from '@shared/infrastructure/http/iso-date';
import { AdministratorDashboardView } from '../../../core/application/use-cases/get-administrator-dashboard.use-case';
import { AdministratorDashboardResponseDto } from '../dtos/administrator-dashboard.response.dto';

/** The dashboard's view to the contract's shape: only dates change, to `YYYY-MM-DD`. */
export class AdministratorDashboardHttpMapper {
  static toResponse(view: AdministratorDashboardView): AdministratorDashboardResponseDto {
    return {
      date: toIsoDate(view.date),
      summary: view.summary,
      casesByJurisdiction: view.casesByJurisdiction,
      deadlines: view.deadlines.map((deadline) => ({ ...deadline, dueDate: toIsoDate(deadline.dueDate) })),
      prescriptionAlerts: view.prescriptionAlerts.map((alert) => ({
        ...alert,
        startsOn: toIsoDate(alert.startsOn),
        expiresOn: toIsoDate(alert.expiresOn),
      })),
      team: view.team,
    };
  }
}
