import { JurisdictionCode } from './jurisdiction-code';

/**
 * How a jurisdiction (fuero) is named in the cloud storage: the middle level of
 * `Causas/{abogado}/{fuero}/{carátula}`. It is the label the study sees in its
 * folders, not the code of the API.
 */
export const JURISDICTION_FOLDER_LABEL: Readonly<Record<JurisdictionCode, string>> = {
  [JurisdictionCode.CRIMINAL]: 'Penal',
  [JurisdictionCode.ADMINISTRATIVE]: 'Administrativo',
  [JurisdictionCode.AMPARO]: 'Amparo',
};
