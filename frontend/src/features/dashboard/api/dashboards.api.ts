import type { ApiItem } from '@/api-contract/envelopes'
import { http } from '@/shared/api/http'
import type { AdministratorDashboard, LawyerDashboard } from '@/features/dashboard/types/dashboard'

const RESOURCE = '/dashboards'

export async function getLawyerDashboard(): Promise<LawyerDashboard> {
    const response = await http.get<ApiItem<LawyerDashboard>>(`${RESOURCE}/lawyer`)
    return response.data.data
}
export async function getAdministratorDashboard(): Promise<AdministratorDashboard> {
    const response = await http.get<ApiItem<AdministratorDashboard>>(`${RESOURCE}/administrator`)
    return response.data.data
}