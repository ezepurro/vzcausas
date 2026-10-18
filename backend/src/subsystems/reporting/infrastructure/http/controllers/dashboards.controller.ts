import { Controller, Get } from '@nestjs/common';
import { AuthenticatedUser } from '@shared/domain/authenticated-user';
import { CurrentUser } from '@shared/infrastructure/http/current-user.decorator';
import { GetLawyerDashboard } from '../../../core/application/use-cases/get-lawyer-dashboard.use-case';
import { LawyerDashboardResponseDto } from '../dtos/lawyer-dashboard.response.dto';
import { LawyerDashboardHttpMapper } from '../mappers/lawyer-dashboard-http.mapper';

/**
 * HTTP entry point for `/dashboards` (contract V4 §3.11): the "Inicio" screen.
 * One dashboard per role: `lawyer` here (HU41); `administrator` is HU42.
 *
 * No `@RequirePermissions`: the lawyer's dashboard needs the `LAWYER` role and
 * a linked lawyer record, and the use case checks both — the same way the
 * responsible lawyer of a case is checked (D-30). A permission alone could not
 * say whose dashboard it is.
 */
@Controller({ path: 'dashboards', version: ['1'] })
export class DashboardsController {
  constructor(private readonly getLawyerDashboard: GetLawyerDashboard) {}

  @Get('lawyer')
  async lawyer(@CurrentUser() actor: AuthenticatedUser): Promise<{ data: LawyerDashboardResponseDto }> {
    const view = await this.getLawyerDashboard.execute({ actor });
    return { data: LawyerDashboardHttpMapper.toResponse(view) };
  }
}
