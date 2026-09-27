import { Jurisdiction } from '../../domain/entities/jurisdiction';

export interface GetProcStatesInput {
  jurisdictionName?: string;
  search?: string;
  page: number;
  limit: number;
}

export interface ProcStateFilter {
  jurisdictionName?: string;
  search?: string;
}
