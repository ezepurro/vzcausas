import { Jurisdiction } from '../../domain/entities/jurisdiction';

export interface GetProcStatesInput {
  jurisdiction?: Jurisdiction;
  search?: string;
  page: number;
  limit: number;
}

export interface ProcStateFilter {
  jurisdictionId?: number;
  isActive?: boolean;
  terminal?: boolean;
  search?: string;
}
