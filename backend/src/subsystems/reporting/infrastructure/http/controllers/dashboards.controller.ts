import { Controller, Get } from '@nestjs/common';
import { AuthenticatedUser } from '@shared/domain/authenticated-user';
import { CurrentUser } from '@shared/infrastructure/http/current-user.decorator';
import { GetAdministratorDashboard } from '../../../core/application/use-cases/get-administrator-dashboard.use-case';
import { GetLawyerDashboard } from '../../../core/application/use-cases/get-lawyer-dashboard.use-case';
import { AdministratorDashboardResponseDto } from '../dtos/administrator-dashboard.response.dto';
import { LawyerDashboardResponseDto } from '../dtos/lawyer-dashboard.response.dto';
import { AdministratorDashboardHttpMapper } from '../mappers/administrator-dashboard-http.mapper';
import { LawyerDashboardHttpMapper } from '../mappers/lawyer-dashboard-http.mapper';

/**
 * HTTP entry point for `/dashboards` (contract V4 §3.11): the "Inicio" screen.
 * One dashboard per role: `lawyer` (HU41) and `administrator` (HU42).
 *
 * No `@RequirePermissions` on either route: the lawyer's dashboard needs the
 * `LAWYER` role and a linked lawyer record, and the use case checks both — the
 * same way the responsible lawyer of a case is checked (D-30). The
 * administrator's only needs the `ADMINISTRATOR` role, which its use case
 * checks the same way, for consistency with its sibling.
 */
@Controller({ path: 'dashboards', version: ['1'] })
export class DashboardsController {
  constructor(
    private readonly getLawyerDashboard: GetLawyerDashboard,
    private readonly getAdministratorDashboard: GetAdministratorDashboard,
  ) {}

  @Get('lawyer')
  async lawyer(@CurrentUser() actor: AuthenticatedUser): Promise<{ data: LawyerDashboardResponseDto }> {
    const view = await this.getLawyerDashboard.execute({ actor });
    return { data: LawyerDashboardHttpMapper.toResponse(view) };
  }

  @Get('administrator')
  async administrator(@CurrentUser() actor: AuthenticatedUser): Promise<{ data: AdministratorDashboardResponseDto }> {
    const view = await this.getAdministratorDashboard.execute({ actor });
    return { data: AdministratorDashboardHttpMapper.toResponse(view) };
  }
}
