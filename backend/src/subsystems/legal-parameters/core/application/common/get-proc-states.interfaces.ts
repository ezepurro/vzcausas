import { JurisdictionCode } from '../../domain/value-objects/jurisdiction-code';

export interface GetProcStatesInput {
  jurisdiction?: JurisdictionCode;
  search?: string;
  page: number;
  limit: number;
}

export interface ProcStateFilter {
  jurisdiction?: JurisdictionCode;
  search?: string;
}
